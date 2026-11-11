import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import Team from '#models/team'
import TeamMember from '#models/team_member'
import Channel from '#models/channel'
import ChannelMember, { type MembershipStatus } from '#models/channel_member'
import ChannelKickVote from '#models/channel_kick_vote'
import User from '#models/user'
import { fail } from '#exceptions/action_exception'
import { teamMemberIds } from '#services/realtime'

/** Kanál bez novej správy dlhšie ako 30 dní zaniká */
export const CHANNEL_INACTIVITY_DAYS = 30

/** Počet hlasov členov potrebných na trvalý ban */
export const KICK_VOTES_FOR_BAN = 3

const DEFAULT_CHANNEL_NAME = 'všeobecný'

type Visibility = 'public' | 'private'

/**
 * Výsledok akcie. Interné polia spracuje finishAction (app/services/action_response.ts):
 * - `announcement` – systémová správa, ktorá sa uloží do kanála `channelId`
 * - `teamId` / `notifyUserIds` – komu poslať udalosť teams:changed
 */
export interface ActionResult {
  message: string
  channel?: string
  announcement?: string
  channelId?: number
  teamId?: number
  notifyUserIds?: number[]
  [key: string]: unknown
}

export function formatChannelName(raw: string) {
  return raw.trim().toLowerCase().replace(/^#/, '').replace(/\s+/g, '-')
}

const toDbVisibility = (type?: Visibility) => (type === 'private' ? 'PRIVATE' : 'PUBLIC')
const toApiVisibility = (type: string): Visibility => (type === 'PRIVATE' ? 'private' : 'public')
const sqlTime = (time: DateTime) => time.toUTC().toFormat('yyyy-MM-dd HH:mm:ss')

// --- Pomocné dotazy ---

async function findTarget(nickname: string) {
  const target = await User.findBy('nickname', nickname.trim())
  if (!target) throw fail(`Používateľ ${nickname.trim()} neexistuje.`, 404)
  return target
}

async function findChannel(channelId: number) {
  const channel = await Channel.query().where('id', channelId).preload('admin').first()
  if (!channel) throw fail('Kanál neexistuje.', 404)
  return channel
}

async function findMembership(channelId: number, userId: number, trx?: TransactionClientContract) {
  return ChannelMember.query({ client: trx })
    .where('channel_id', channelId)
    .where('user_id', userId)
    .first()
}

async function setMembership(
  channelId: number,
  userId: number,
  status: MembershipStatus,
  trx?: TransactionClientContract
) {
  return ChannelMember.updateOrCreate(
    { channelId, userId },
    { status, joinedAt: status === 'ACTIVE' ? DateTime.now() : null },
    { client: trx }
  )
}

async function ensureTeamMember(teamId: number, userId: number, trx?: TransactionClientContract) {
  return TeamMember.firstOrCreate({ teamId, userId }, {}, { client: trx })
}

async function assertTeamMember(teamId: number, userId: number) {
  const team = await Team.query().where('id', teamId).preload('admin').first()
  if (!team) throw fail('Server neexistuje.', 404)
  const member = await TeamMember.query().where('team_id', teamId).where('user_id', userId).first()
  if (!member) throw fail('Nie si členom tohto servera.', 403)
  return team
}

async function createChannel(
  teamId: number,
  admin: User,
  name: string,
  type: Visibility,
  trx?: TransactionClientContract
) {
  const channel = await Channel.create(
    { teamId, adminId: admin.id, name, type: toDbVisibility(type), lastActivityAt: DateTime.now() },
    { client: trx }
  )
  await setMembership(channel.id, admin.id, 'ACTIVE', trx)
  return channel
}

/**
 * Zmaže kanál (členstvá, hlasy aj správy idú cez ON DELETE CASCADE).
 * Ak by v tíme nezostal žiadny kanál, vytvorí sa nový "všeobecný".
 */
async function deleteChannel(channel: Channel, fallbackAdmin: User) {
  await db.transaction(async (trx) => {
    channel.useTransaction(trx)
    await channel.delete()
    const remaining = await Channel.query({ client: trx }).where('team_id', channel.teamId).first()
    if (!remaining) {
      await createChannel(channel.teamId, fallbackAdmin, DEFAULT_CHANNEL_NAME, 'public', trx)
    }
  })
}

async function ban(channel: Channel, membership: ChannelMember) {
  membership.status = 'BANNED'
  membership.joinedAt = null
  await membership.save()
  await ChannelKickVote.query()
    .where('channel_id', channel.id)
    .where('target_user_id', membership.userId)
    .delete()
}

// --- 30 dní neaktivity ---

/**
 * Zruší kanály bez novej správy dlhšie ako 30 dní, aby sa ich názov dal znova použiť.
 * @returns zaniknuté kanály
 */
export async function removeExpiredChannels() {
  const limit = DateTime.now().minus({ days: CHANNEL_INACTIVITY_DAYS })
  const expired = await Channel.query().where('last_activity_at', '<', sqlTime(limit))
  if (expired.length === 0) return expired

  await Channel.query()
    .whereIn(
      'id',
      expired.map((c) => c.id)
    )
    .delete()
  return expired
}

// --- Zoznam tímov a kanálov ---

/**
 * Tímy používateľa s kanálmi, ktoré smie vidieť: všetky verejné
 * a súkromné, v ktorých je členom alebo pozvaný.
 * Tvar dát zodpovedá tomu, s čím pracuje frontend (zoznamy prezývok).
 */
export async function teamsForUser(user: User) {
  await removeExpiredChannels()

  const teams = await Team.query()
    .whereIn('id', TeamMember.query().select('team_id').where('user_id', user.id))
    .preload('admin')
    .preload('members', (q) => q.preload('user'))
    .preload('channels', (q) =>
      q
        .orderBy('id')
        .preload('admin')
        .preload('members', (m) => m.preload('user'))
        .preload('kickVotes', (k) => k.preload('voter').preload('targetUser'))
    )
    .orderBy('id')

  return teams.map((team) => {
    const userStatuses: Record<string, string> = {}
    for (const tm of team.members) {
      userStatuses[tm.user.nickname.toLowerCase()] = tm.user.status.toLowerCase()
    }

    return {
      id: team.id,
      name: team.name,
      type: toApiVisibility(team.type),
      admin: team.admin.nickname,
      members: team.members.map((m) => m.user.nickname),
      userStatuses,
      channels: team.channels
        .filter((channel) => {
          if (channel.type === 'PUBLIC' || channel.adminId === user.id) return true
          const own = channel.members.find((m) => m.userId === user.id)
          return own?.status === 'ACTIVE' || own?.status === 'INVITED'
        })
        .map((channel) => {
          const byStatus = (status: MembershipStatus) =>
            channel.members.filter((m) => m.status === status).map((m) => m.user.nickname)

          const kicks: Record<string, string[]> = {}
          for (const vote of channel.kickVotes) {
            const target = vote.targetUser.nickname
            kicks[target] = [...(kicks[target] || []), vote.voter.nickname]
          }

          return {
            id: channel.id,
            name: channel.name,
            type: toApiVisibility(channel.type),
            admin: channel.admin.nickname,
            members: byStatus('ACTIVE'),
            invited: byStatus('INVITED'),
            banned: byStatus('BANNED'),
            kicks,
            lastActivity: channel.lastActivityAt.toMillis(),
          }
        }),
    }
  })
}

// --- Tímy (servery) ---

export async function createTeam(user: User, name: string, type?: Visibility) {
  const team = await db.transaction(async (trx) => {
    const created = await Team.create(
      { name, adminId: user.id, type: toDbVisibility(type) },
      { client: trx }
    )
    await ensureTeamMember(created.id, user.id, trx)
    await createChannel(created.id, user, DEFAULT_CHANNEL_NAME, 'public', trx)
    return created
  })

  return {
    message: `Server "${name}" bol úspešne vytvorený a stal si sa jeho vlastníkom.`,
    teamId: team.id,
    channel: DEFAULT_CHANNEL_NAME,
  }
}

export async function deleteTeam(user: User, teamId: number): Promise<ActionResult> {
  const team = await assertTeamMember(teamId, user.id)
  if (team.adminId !== user.id) {
    throw fail(`Iba správca servera ("${team.admin.nickname}") môže zmazať tento server.`, 403)
  }
  const notifyUserIds = await teamMemberIds(team.id)
  await team.delete()
  return { message: `Server "${team.name}" bol úspešne zmazaný.`, notifyUserIds }
}

/**
 * Odchod zo servera: zruší členstvo v tíme aj v jeho kanáloch
 * a kanály, ktorých bol používateľ správcom, zaniknú.
 */
export async function leaveTeam(user: User, teamId: number): Promise<ActionResult> {
  const team = await assertTeamMember(teamId, user.id)
  if (team.adminId === user.id) {
    throw fail('Správca servera ho nemôže opustiť, môže ho iba zmazať.', 400)
  }

  await db.transaction(async (trx) => {
    const channelIds = Channel.query({ client: trx }).select('id').where('team_id', team.id)
    await ChannelMember.query({ client: trx })
      .whereIn('channel_id', channelIds)
      .where('user_id', user.id)
      .whereNot('status', 'BANNED')
      .delete()
    await Channel.query({ client: trx })
      .where('team_id', team.id)
      .where('admin_id', user.id)
      .delete()
    await TeamMember.query({ client: trx })
      .where('team_id', team.id)
      .where('user_id', user.id)
      .delete()

    const remaining = await Channel.query({ client: trx }).where('team_id', team.id).first()
    if (!remaining) {
      await createChannel(team.id, team.admin, DEFAULT_CHANNEL_NAME, 'public', trx)
    }
  })

  return { message: `Opustil si server "${team.name}".`, teamId: team.id, notifyUserIds: [user.id] }
}

/**
 * Pridanie používateľa do tímu – stane sa členom prvého verejného kanála.
 */
export async function addTeamMember(
  user: User,
  teamId: number,
  nickname: string
): Promise<ActionResult> {
  const team = await assertTeamMember(teamId, user.id)
  const target = await findTarget(nickname)
  if (target.id === user.id) throw fail('Nemôžeš pozvať sám seba.')

  const existing = await TeamMember.query()
    .where('team_id', team.id)
    .where('user_id', target.id)
    .first()
  if (existing) throw fail(`Používateľ ${target.nickname} už je členom servera "${team.name}".`)

  const firstPublic = await Channel.query()
    .where('team_id', team.id)
    .where('type', 'PUBLIC')
    .orderBy('id')
    .first()

  await db.transaction(async (trx) => {
    await ensureTeamMember(team.id, target.id, trx)
    if (firstPublic) {
      const membership = await findMembership(firstPublic.id, target.id, trx)
      if (membership?.status !== 'BANNED') {
        await setMembership(firstPublic.id, target.id, 'ACTIVE', trx)
      }
    }
  })

  return {
    message: `Používateľ ${target.nickname} bol úspešne pridaný do tímu "${team.name}".`,
    channel: firstPublic?.name,
    channelId: firstPublic?.id,
    teamId: team.id,
    announcement: `Používateľ ${user.nickname} pridal používateľa ${target.nickname} do tímu "${team.name}".`,
  }
}

// --- Kanály ---

/**
 * /join channelName [private] – pripojí sa do existujúceho kanála,
 * alebo vytvorí nový (používateľ sa stane jeho správcom).
 */
export async function joinChannel(
  user: User,
  teamId: number,
  rawName: string,
  type?: Visibility
): Promise<ActionResult> {
  await assertTeamMember(teamId, user.id)
  const name = formatChannelName(rawName)
  if (!name) throw fail('Použitie: /join <channelName> [private]')

  // Názov zaniknutého kanála musí byť znova voľný
  await removeExpiredChannels()

  const existing = await Channel.query().where('team_id', teamId).where('name', name).first()

  if (!existing) {
    const visibility = type ?? 'public'
    const created = await createChannel(teamId, user, name, visibility)
    return {
      message: `Kanál #${name} bol úspešne vytvorený a stal si sa jeho správcom.`,
      channel: name,
      channelId: created.id,
      teamId,
      announcement: `Používateľ ${user.nickname} vytvoril nový ${
        visibility === 'private' ? 'súkromný' : 'verejný'
      } kanál #${name}.`,
    }
  }

  const membership = await findMembership(existing.id, user.id)
  if (membership?.status === 'BANNED') {
    throw fail(
      `Nemôžeš sa pripojiť do kanála #${existing.name}, pretože v ňom máš trvalý ban.`,
      403
    )
  }
  if (existing.type === 'PRIVATE' && !membership && existing.adminId !== user.id) {
    throw fail(
      `Kanál #${existing.name} je súkromný. Vstup je povolený iba na pozvánku od správcu.`,
      403
    )
  }

  if (membership?.status !== 'ACTIVE') {
    await setMembership(existing.id, user.id, 'ACTIVE')
    return {
      message: `Pripojil si sa do kanála #${existing.name}.`,
      channel: existing.name,
      channelId: existing.id,
      teamId,
      announcement: `Používateľ ${user.nickname} sa pripojil do kanála #${existing.name}.`,
    }
  }

  return {
    message: `Pripojil si sa do kanála #${existing.name}.`,
    channel: existing.name,
    channelId: existing.id,
    teamId,
  }
}

/**
 * /cancel – zrušenie vlastného členstva (ak je správca, kanál zaniká)
 */
export async function leaveChannel(user: User, channelId: number): Promise<ActionResult> {
  const channel = await findChannel(channelId)

  if (channel.adminId === user.id) {
    await deleteChannel(channel, user)
    return {
      message: `Ako správca si zrušil svoje členstvo, preto kanál #${channel.name} zanikol.`,
      channel: channel.name,
      channelId: channel.id,
      teamId: channel.teamId,
      deleted: true,
    }
  }

  const membership = await findMembership(channel.id, user.id)
  if (!membership || membership.status === 'BANNED') {
    throw fail(`Nie si členom kanála #${channel.name}.`)
  }
  await membership.delete()

  return {
    message: `Zrušil si svoje členstvo v kanáli #${channel.name}.`,
    channel: channel.name,
    channelId: channel.id,
    teamId: channel.teamId,
    deleted: false,
    announcement: `Používateľ ${user.nickname} zrušil svoje členstvo v kanáli #${channel.name}.`,
  }
}

/**
 * /quit – zrušenie kanála správcom
 */
export async function deleteChannelByAdmin(user: User, channelId: number): Promise<ActionResult> {
  const channel = await findChannel(channelId)
  if (channel.adminId !== user.id) {
    throw fail('Iba správca kanála môže zrušiť kanál príkazom /quit.', 403)
  }
  await deleteChannel(channel, user)
  return {
    message: `Kanál #${channel.name} bol zrušený správcom.`,
    channel: channel.name,
    channelId: channel.id,
    teamId: channel.teamId,
    deleted: true,
  }
}

/**
 * /invite nickName – pozvánka do kanála; správca verejného kanála ňou ruší trvalý ban
 */
export async function inviteToChannel(
  user: User,
  channelId: number,
  nickname: string
): Promise<ActionResult> {
  const channel = await findChannel(channelId)
  const target = await findTarget(nickname)
  if (target.id === user.id) throw fail('Nemôžeš pozvať sám seba.')

  const isAdmin = channel.adminId === user.id
  const own = await findMembership(channel.id, user.id)
  const targetMembership = await findMembership(channel.id, target.id)

  if (targetMembership?.status === 'ACTIVE') {
    throw fail(`Používateľ ${target.nickname} už je členom kanála #${channel.name}.`)
  }

  if (channel.type === 'PRIVATE') {
    if (!isAdmin) throw fail('Iba správca súkromného kanála môže pozývať používateľov.', 403)
  } else {
    if (!isAdmin && own?.status !== 'ACTIVE') {
      throw fail('Musíš byť členom kanála, aby si mohol pozvať iného používateľa.', 403)
    }

    if (targetMembership?.status === 'BANNED') {
      if (!isAdmin) {
        throw fail(
          `Používateľ ${target.nickname} má trvalý ban. Prístup mu môže obnoviť iba správca kanála (${channel.admin.nickname}).`,
          403
        )
      }
      await db.transaction(async (trx) => {
        await setMembership(channel.id, target.id, 'ACTIVE', trx)
        await ChannelKickVote.query({ client: trx })
          .where('channel_id', channel.id)
          .where('target_user_id', target.id)
          .delete()
        await ensureTeamMember(channel.teamId, target.id, trx)
      })
      return {
        message: `Prístup do kanála #${channel.name} pre používateľa ${target.nickname} bol úspešne obnovený.`,
        channel: channel.name,
        channelId: channel.id,
        teamId: channel.teamId,
        announcement: `Správca ${user.nickname} obnovil prístup používateľovi ${target.nickname} do kanála #${channel.name}.`,
      }
    }
  }

  await db.transaction(async (trx) => {
    await setMembership(channel.id, target.id, 'INVITED', trx)
    // Pozvaný používateľ musí vidieť tím, v ktorom je kanál
    await ensureTeamMember(channel.teamId, target.id, trx)
  })

  const isPrivate = channel.type === 'PRIVATE'
  return {
    message: `Používateľ ${target.nickname} bol pozvaný do ${isPrivate ? 'súkromného ' : ''}kanála #${channel.name}.`,
    channel: channel.name,
    channelId: channel.id,
    teamId: channel.teamId,
    announcement: isPrivate
      ? `Správca ${user.nickname} pozval používateľa ${target.nickname} do súkromného kanála #${channel.name}.`
      : `Používateľ ${user.nickname} pozval ${target.nickname} do kanála #${channel.name}.`,
  }
}

/**
 * /revoke nickName – správca súkromného kanála odoberie prístup
 */
export async function revokeFromChannel(
  user: User,
  channelId: number,
  nickname: string
): Promise<ActionResult> {
  const channel = await findChannel(channelId)
  if (channel.type !== 'PRIVATE') {
    throw fail('Príkaz /revoke je určený iba pre súkromné kanály.')
  }
  if (channel.adminId !== user.id) {
    throw fail('Iba správca súkromného kanála môže odoberať prístup používateľom.', 403)
  }

  const target = await findTarget(nickname)
  if (target.id === channel.adminId) {
    throw fail('Správca kanála nemôže odobrať prístup sám sebe.')
  }

  const membership = await findMembership(channel.id, target.id)
  if (!membership) {
    throw fail(`Používateľ ${target.nickname} nie je členom kanála #${channel.name}.`)
  }
  await membership.delete()

  return {
    message: `Používateľovi ${target.nickname} bol odobraný prístup do kanála #${channel.name}.`,
    channel: channel.name,
    channelId: channel.id,
    teamId: channel.teamId,
    announcement: `Správca ${user.nickname} odobral prístup používateľovi ${target.nickname} zo súkromného kanála #${channel.name}.`,
  }
}

/**
 * /kick nickName – správca vyhodí natrvalo, bežní členovia hlasujú (3 hlasy = trvalý ban)
 */
export async function kickFromChannel(
  user: User,
  channelId: number,
  nickname: string
): Promise<ActionResult> {
  const channel = await findChannel(channelId)
  const target = await findTarget(nickname)

  if (channel.type === 'PRIVATE') {
    throw fail('V súkromnom kanáli použi príkaz /revoke <nickName>.')
  }

  const targetMembership = await findMembership(channel.id, target.id)
  if (!targetMembership || targetMembership.status === 'INVITED') {
    throw fail(`Používateľ ${target.nickname} nie je členom kanála #${channel.name}.`)
  }
  if (target.id === user.id) throw fail('Nemôžeš vyhodiť sám seba.')
  if (target.id === channel.adminId) throw fail('Správca kanála nemôže byť vyhodený.')

  const isAdmin = channel.adminId === user.id
  const own = await findMembership(channel.id, user.id)
  if (!isAdmin && own?.status !== 'ACTIVE') {
    throw fail('Iba členovia kanála môžu vyhadzovať iných používateľov.', 403)
  }
  if (targetMembership.status === 'BANNED') {
    throw fail(`Používateľ ${target.nickname} už má v tomto kanáli trvalý ban.`)
  }

  if (isAdmin) {
    await ban(channel, targetMembership)
    return {
      message: `Používateľ ${target.nickname} bol natrvalo vyhodený správcom.`,
      channel: channel.name,
      channelId: channel.id,
      teamId: channel.teamId,
      announcement: `Správca ${user.nickname} vyhodil používateľa ${target.nickname} natrvalo (trvalý ban).`,
    }
  }

  const alreadyVoted = await ChannelKickVote.query()
    .where('channel_id', channel.id)
    .where('voter_id', user.id)
    .where('target_user_id', target.id)
    .first()
  if (alreadyVoted) throw fail(`Už si hlasoval za vyhodenie používateľa ${target.nickname}.`)

  await ChannelKickVote.create({ channelId: channel.id, voterId: user.id, targetUserId: target.id })
  const votes = await ChannelKickVote.query()
    .where('channel_id', channel.id)
    .where('target_user_id', target.id)
    .count('* as total')
  const voteCount = Number(votes[0].$extras.total)

  if (voteCount >= KICK_VOTES_FOR_BAN) {
    await ban(channel, targetMembership)
    return {
      message: `Používateľ ${target.nickname} bol vyhodený (${KICK_VOTES_FOR_BAN} hlasy dosiahnuté) a má trvalý ban.`,
      channel: channel.name,
      channelId: channel.id,
      teamId: channel.teamId,
      announcement: `Používateľ ${target.nickname} bol vyhodený na základe ${KICK_VOTES_FOR_BAN} hlasov členov a dostal trvalý ban pre kanál #${channel.name}.`,
    }
  }

  return {
    message: `Hlas za vyhodenie používateľa ${target.nickname} bol zaznamenaný (${voteCount}/${KICK_VOTES_FOR_BAN}).`,
    channel: channel.name,
    channelId: channel.id,
    teamId: channel.teamId,
    announcement: `Používateľ ${user.nickname} hlasoval za vyhodenie ${target.nickname} (${voteCount}/${KICK_VOTES_FOR_BAN}).`,
  }
}
