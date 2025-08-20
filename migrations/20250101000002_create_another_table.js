/**
 * Create another_table with an auto-incrementing primary key, a non-nullable varchar, and a non-nullable integer column.
 */
exports.up = function (knex) {
  return knex.schema.createTable('another_table', (table) => {
    table.increments('id').primary().unsigned();
    table.string('name').notNullable();
    table.integer('value').notNullable();
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('another_table');
};
