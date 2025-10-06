/**
 * Remove the previously added indexes from gadgets.
 */
const { alterTableWithPtosc } = require('knex-ptosc-plugin');
const { createPtoscOptions } = require('../src/ptosc-options');

exports.up = function (knex) {
  return alterTableWithPtosc(
    knex,
    'gadgets',
    (table) => {
      table.dropIndex('title', 'gadgets_title_idx');
      table.dropIndex(['status', 'qty'], 'gadgets_status_qty_idx');
    },
    createPtoscOptions('gadgets_indexes_cleanup')
  );
};

exports.down = function (knex) {
  return alterTableWithPtosc(
    knex,
    'gadgets',
    (table) => {
      table.index('title', 'gadgets_title_idx');
      table.index(['status', 'qty'], 'gadgets_status_qty_idx');
    },
    createPtoscOptions('gadgets_indexes_restore')
  );
};
