/**
 * Rename the name column to title in widgets.
 */

exports.up = function (knex) {
  return knex.schema.alterTable('widgets', function(table) {
    table.renameColumn('name', 'title');
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable('widgets', function(table) {
    table.renameColumn('title', 'name');
  });
};
