import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Channel from '#models/channel'
import User from '#models/user'

export type MembershipStatus = 'INVITED' | 'ACTIVE' | 'BANNED'

export default class ChannelMember extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare channelId: number

  @column()
  declare userId: number

  @column()
  declare status: MembershipStatus

  @column.dateTime({ autoCreate: true })
  declare invitedAt: DateTime | null

  @column.dateTime()
  declare joinedAt: DateTime | null

  // Relationships
  @belongsTo(() => Channel, { foreignKey: 'channelId' })
  declare channel: BelongsTo<typeof Channel>

  @belongsTo(() => User, { foreignKey: 'userId' })
  declare user: BelongsTo<typeof User>
}

