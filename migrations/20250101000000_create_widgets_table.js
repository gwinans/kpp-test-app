/**
 * Create widgets table with a simple schema for later alterations.
 */

exports.up = function (knex) {
  return knex.schema.createTable('widgets', (table) => {
    table.increments('id').primary().unsigned();
    table.string('name').notNullable();
    table.integer('qty').notNullable();
    table.enu('status', ['active', 'inactive']).notNullable().defaultTo('active');
    table.decimal('price', 10, 2).notNullable().defaultTo(0);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('widgets');
};
