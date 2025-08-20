/**
 * Add json_test column to test_table.
 */
exports.up = function (knex) {
  return knex.schema.alterTable('test_table', (table) => {
    table.json('json_test');
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable('test_table', (table) => {
    table.dropColumn('json_test');
  });
};
