import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table.string('name', 255).notNullable()
      table.string('surname', 255).notNullable()
      table.string('nickname', 100).notNullable().unique()
      table.string('email', 254).notNullable().unique()
      table.string('password_hash', 255).notNullable()
      table
        .enum('status', ['ONLINE', 'MENTIONS', 'DND', 'OFFLINE'])
        .notNullable()
        .defaultTo('OFFLINE')

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
