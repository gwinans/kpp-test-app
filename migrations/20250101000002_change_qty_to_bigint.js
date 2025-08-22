/**
 * Change qty column from integer to bigInteger.
 */
const { alterTableWithPtosc } = require('knex-ptosc-plugin');

exports.up = function (knex) {
  return alterTableWithPtosc(knex, 'widgets', (table) => {
    table.bigInteger('qty').alter();
  });
};

exports.down = function (knex) {
  return alterTableWithPtosc(knex, 'widgets', (table) => {
    table.integer('qty').alter();
  });
};
