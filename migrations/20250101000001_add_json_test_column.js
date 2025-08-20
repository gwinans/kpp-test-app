/**
 * Add json_test column to test_table.
 * This migration uses the pt-online-schema-change plugin to alter the table without locking it.
 */

const { alterTableWithPtosc } = require('knex-ptosc-plugin');

exports.up = function (knex) {
  return alterTableWithPtosc(knex, 'test_table', (table) => {
    table.json('json_test');
  }, {
    maxLoad: 150,
    criticalLoad: 50,
    alterForeignKeysMethod: 'auto',
  });
};

exports.down = function (knex) {
  return alterTableWithPtosc(knex, 'test_table', (table) => {
    table.dropColumn('json_test');
  }, {
    maxLoad: 150,
    criticalLoad: 50,
    alterForeignKeysMethod: 'auto',
  });
};
