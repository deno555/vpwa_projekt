import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import User from '#models/user'
import TeamMember from '#models/team_member'
import Channel from '#models/channel'

export type VisibilityType = 'PUBLIC' | 'PRIVATE'

export default class Team extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare name: string

  @column()
  declare adminId: number

  @column()
  declare type: VisibilityType

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  // Relationships
  @belongsTo(() => User, { foreignKey: 'adminId' })
  declare admin: BelongsTo<typeof User>

  @hasMany(() => TeamMember, { foreignKey: 'teamId' })
  declare members: HasMany<typeof TeamMember>

  @hasMany(() => Channel, { foreignKey: 'teamId' })
  declare channels: HasMany<typeof Channel>
}

