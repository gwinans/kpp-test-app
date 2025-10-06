/**
 * Change qty column from integer to bigInteger.
 */
const { alterTableWithPtosc } = require('knex-ptosc-plugin');
const { createPtoscOptions } = require('../src/ptosc-options');

exports.up = function (knex) {
  return alterTableWithPtosc(
    knex,
    'widgets',
    (table) => {
      table.bigInteger('qty').alter();
    },
    createPtoscOptions('widgets_qty_bigint')
  );
};

exports.down = function (knex) {
  return alterTableWithPtosc(
    knex,
    'widgets',
    (table) => {
      table.integer('qty').alter();
    },
    createPtoscOptions('widgets_qty_int')
  );
};
