/**
 * Rename the name column to title in widgets.
 */
const { alterTableWithPtosc } = require('knex-ptosc-plugin');

exports.up = function (knex) {
  return alterTableWithPtosc(knex, 'widgets', (table) => {
    table.renameColumn('name', 'title');
  });
};

exports.down = function (knex) {
  return alterTableWithPtosc(knex, 'widgets', (table) => {
    table.renameColumn('title', 'name');
  });
};
