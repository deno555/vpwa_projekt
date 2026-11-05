import hash from '@adonisjs/core/services/hash'
import { compose } from '@adonisjs/core/helpers'
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'
import { type AccessToken, DbAccessTokensProvider } from '@adonisjs/auth/access_tokens'
import { BaseModel, column, hasMany, manyToMany } from '@adonisjs/lucid/orm'
import type { HasMany, ManyToMany } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import Team from '#models/team'
import TeamMember from '#models/team_member'
import Channel from '#models/channel'
import ChannelMember from '#models/channel_member'
import ChannelKickVote from '#models/channel_kick_vote'
import Message from '#models/message'

export type UserStatus = 'ONLINE' | 'MENTIONS' | 'DND' | 'OFFLINE'

export default class User extends compose(
  BaseModel,
  withAuthFinder(hash, {
    uids: ['email', 'nickname'],
    passwordColumnName: 'passwordHash',
  })
) {
  static accessTokens = DbAccessTokensProvider.forModel(User)
  declare currentAccessToken?: AccessToken

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare name: string

  @column()
  declare surname: string

  @column()
  declare nickname: string

  @column()
  declare email: string

  @column({ serializeAs: null })
  declare passwordHash: string

  // Setter/getter alias for password
  get password(): string {
    return this.passwordHash
  }

  set password(value: string) {
    this.passwordHash = value
  }

  @column()
  declare status: UserStatus

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  get fullName() {
    return `${this.name} ${this.surname}`.trim()
  }

  get initials() {
    if (this.name && this.surname) {
      return `${this.name.charAt(0)}${this.surname.charAt(0)}`.toUpperCase()
    }
    return `${this.nickname?.slice(0, 2) || this.email.slice(0, 2)}`.toUpperCase()
  }

  // Relations
  @hasMany(() => Team, { foreignKey: 'adminId' })
  declare teamsAdministered: HasMany<typeof Team>

  @hasMany(() => TeamMember, { foreignKey: 'userId' })
  declare teamMemberships: HasMany<typeof TeamMember>

  @manyToMany(() => Team, {
    pivotTable: 'team_members',
    pivotForeignKey: 'user_id',
    pivotRelatedForeignKey: 'team_id',
  })
  declare teams: ManyToMany<typeof Team>

  @hasMany(() => Channel, { foreignKey: 'adminId' })
  declare channelsAdministered: HasMany<typeof Channel>

  @hasMany(() => ChannelMember, { foreignKey: 'userId' })
  declare channelMemberships: HasMany<typeof ChannelMember>

  @manyToMany(() => Channel, {
    pivotTable: 'channel_members',
    pivotForeignKey: 'user_id',
    pivotRelatedForeignKey: 'channel_id',
  })
  declare channels: ManyToMany<typeof Channel>

  @hasMany(() => Message, { foreignKey: 'authorId' })
  declare messages: HasMany<typeof Message>

  @manyToMany(() => Message, {
    pivotTable: 'message_mentions',
    pivotForeignKey: 'user_id',
    pivotRelatedForeignKey: 'message_id',
  })
  declare mentionedInMessages: ManyToMany<typeof Message>

  @hasMany(() => ChannelKickVote, { foreignKey: 'voterId' })
  declare kickVotesCast: HasMany<typeof ChannelKickVote>

  @hasMany(() => ChannelKickVote, { foreignKey: 'targetUserId' })
  declare kickVotesTargeted: HasMany<typeof ChannelKickVote>
}
