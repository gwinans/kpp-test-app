/**
 * Create widgets table with a simple schema for later alterations.
 */

exports.up = function (knex) {
  return knex.schema.createTable('widgets', (table) => {
    table.increments('id').primary().unsigned();
    table.string('name').notNullable();
    table.integer('qty').notNullable();
    table.enu('status', ['active', 'inactive']).notNullable().defaultTo('active');
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('widgets');
};
