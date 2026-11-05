import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import Team from '#models/team'
import User from '#models/user'
import ChannelMember from '#models/channel_member'
import ChannelKickVote from '#models/channel_kick_vote'
import Message from '#models/message'
import type { VisibilityType } from '#models/team'

export default class Channel extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare teamId: number

  @column()
  declare adminId: number

  @column()
  declare name: string

  @column()
  declare type: VisibilityType

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true })
  declare lastActivityAt: DateTime

  // Relationships
  @belongsTo(() => Team, { foreignKey: 'teamId' })
  declare team: BelongsTo<typeof Team>

  @belongsTo(() => User, { foreignKey: 'adminId' })
  declare admin: BelongsTo<typeof User>

  @hasMany(() => ChannelMember, { foreignKey: 'channelId' })
  declare members: HasMany<typeof ChannelMember>

  @hasMany(() => ChannelKickVote, { foreignKey: 'channelId' })
  declare kickVotes: HasMany<typeof ChannelKickVote>

  @hasMany(() => Message, { foreignKey: 'channelId' })
  declare messages: HasMany<typeof Message>
}

