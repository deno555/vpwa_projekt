import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Message from '#models/message'
import User from '#models/user'

export default class MessageMention extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare messageId: number

  @column()
  declare userId: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  // Relationships
  @belongsTo(() => Message, { foreignKey: 'messageId' })
  declare message: BelongsTo<typeof Message>

  @belongsTo(() => User, { foreignKey: 'userId' })
  declare user: BelongsTo<typeof User>
}

