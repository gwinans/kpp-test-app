/**
 * Create test_table with a varchar and an integer column.
 */
exports.up = function (knex) {
  return knex.schema.createTable('test_table', (table) => {
    table.string('name');
    table.integer('value');
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('test_table');
};
