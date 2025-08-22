/**
 * Remove the previously added indexes from gadgets.
 */
const { alterTableWithPtosc } = require('knex-ptosc-plugin');

exports.up = function (knex) {
  return alterTableWithPtosc(knex, 'gadgets', (table) => {
    table.dropIndex('title', 'gadgets_title_idx');
    table.dropIndex(['status', 'qty'], 'gadgets_status_qty_idx');
  });
};

exports.down = function (knex) {
  return alterTableWithPtosc(knex, 'gadgets', (table) => {
    table.index('title', 'gadgets_title_idx');
    table.index(['status', 'qty'], 'gadgets_status_qty_idx');
  });
};
