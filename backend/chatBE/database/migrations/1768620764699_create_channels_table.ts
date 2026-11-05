import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'channels'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table
        .integer('team_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('teams')
        .onDelete('CASCADE')
      table
        .integer('admin_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      table.string('name', 255).notNullable()
      table.enum('type', ['PUBLIC', 'PRIVATE']).notNullable().defaultTo('PUBLIC')
      table.timestamp('created_at').notNullable()
      table.timestamp('last_activity_at').notNullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}

