/**
 * Rename widgets table to gadgets.
 */

exports.up = function (knex) {
  return knex.schema.renameTable('widgets', 'gadgets');
};

exports.down = function (knex) {
  return knex.schema.renameTable('gadgets', 'widgets');
};
