import { DateTime } from 'luxon'
import Channel from '#models/channel'
import ChannelMember from '#models/channel_member'
import Message from '#models/message'
import type User from '#models/user'
import { fail } from '#exceptions/action_exception'
import { emitToUsers } from '#services/realtime'

/** Počet správ v jednej stránke histórie (infinite scroll) */
export const MESSAGES_PAGE_SIZE = 20

/** Tvar správy, s ktorým pracuje frontend */
export function serializeMessage(message: Message) {
  return {
    id: message.id,
    channelId: message.channelId,
    author: message.isSystem ? 'Systém' : message.author.nickname,
    text: message.content,
    isSystem: message.isSystem,
    createdAt: message.createdAt.toISO(),
  }
}

async function findChannel(channelId: number) {
  const channel = await Channel.query().where('id', channelId).preload('team').first()
  if (!channel) throw fail('Kanál neexistuje.', 404)
  return channel
}

async function activeMemberIds(channelId: number) {
  const members = await ChannelMember.query()
    .select('user_id')
    .where('channel_id', channelId)
    .where('status', 'ACTIVE')
  return members.map((m) => m.userId)
}

/**
 * Rozpošle novú správu všetkým aktívnym členom kanála (aj odosielateľovi,
 * aby ju videl vo všetkých svojich kartách).
 */
async function broadcast(channel: Channel, message: Message) {
  await message.load('author')
  emitToUsers(await activeMemberIds(channel.id), 'message:new', {
    ...serializeMessage(message),
    channelName: channel.name,
    teamName: channel.team.name,
  })
}

/**
 * Prezývky označené v texte (@nick), ktoré patria aktívnym členom kanála.
 */
async function mentionedMembers(channelId: number, content: string) {
  const nicknames = [...content.matchAll(/@([a-zA-Z0-9_.-]+)/g)].map((m) => m[1].toLowerCase())
  if (nicknames.length === 0) return []

  const members = await ChannelMember.query()
    .where('channel_id', channelId)
    .where('status', 'ACTIVE')
    .preload('user')
  return members.filter((m) => nicknames.includes(m.user.nickname.toLowerCase()))
}

/**
 * História kanála po stránkach (od najnovších). Verejný kanál si môže prečítať
 * každý, kto v ňom nemá ban; súkromný iba jeho členovia.
 */
export async function listMessages(user: User, channelId: number, beforeId?: number) {
  const channel = await findChannel(channelId)
  const membership = await ChannelMember.query()
    .where('channel_id', channel.id)
    .where('user_id', user.id)
    .first()

  if (membership?.status === 'BANNED') {
    throw fail(`V kanáli #${channel.name} máš trvalý ban.`, 403)
  }
  if (channel.type === 'PRIVATE' && membership?.status !== 'ACTIVE') {
    throw fail(`Kanál #${channel.name} je súkromný.`, 403)
  }

  const query = Message.query()
    .where('channel_id', channel.id)
    .preload('author')
    .orderBy('id', 'desc')
    .limit(MESSAGES_PAGE_SIZE + 1)
  if (beforeId) query.where('id', '<', beforeId)

  const rows = await query
  const hasMore = rows.length > MESSAGES_PAGE_SIZE
  return {
    messages: rows.slice(0, MESSAGES_PAGE_SIZE).reverse().map(serializeMessage),
    hasMore,
  }
}

/**
 * Odoslanie správy – iba aktívny člen kanála. Nová správa posúva
 * hranicu 30-dňovej neaktivity kanála.
 */
export async function sendMessage(user: User, channelId: number, content: string) {
  const channel = await findChannel(channelId)
  const membership = await ChannelMember.query()
    .where('channel_id', channel.id)
    .where('user_id', user.id)
    .first()

  if (membership?.status === 'BANNED') {
    throw fail(`Nemôžeš odoslať správu, pretože máš v kanáli #${channel.name} trvalý ban.`, 403)
  }
  if (membership?.status !== 'ACTIVE') {
    throw fail(
      `Nie si členom kanála #${channel.name}. Ak sa chceš pridať, použi príkaz /join ${channel.name}.`,
      403
    )
  }

  const message = await Message.create({
    channelId: channel.id,
    authorId: user.id,
    content,
    isSystem: false,
  })

  const mentions = await mentionedMembers(channel.id, content)
  if (mentions.length > 0) {
    await message.related('mentions').attach(mentions.map((m) => m.userId))
  }

  channel.lastActivityAt = DateTime.now()
  await channel.save()

  await broadcast(channel, message)
  return serializeMessage(message)
}

/**
 * Systémová správa v kanáli (napr. "Používateľ X sa pripojil").
 * Autorom je používateľ, ktorý akciu vykonal; zobrazuje sa ako "Systém".
 */
export async function postSystemMessage(channelId: number, authorId: number, content: string) {
  const channel = await Channel.query().where('id', channelId).preload('team').first()
  if (!channel) return

  const message = await Message.create({ channelId, authorId, content, isSystem: true })
  await broadcast(channel, message)
}
