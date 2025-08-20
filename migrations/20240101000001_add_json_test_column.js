/**
 * Add json_test column to test_table.
 */

const { alterTableWithBuilder } = require('knex-ptosc-plugin');

exports.up = function (knex) {
  return alterTableWithBuilder(knex, 'test_table', (table) => {
    table.json('json_test');
  }, {
    maxLoad: 150,
    criticalLoad: 50,
    alterForeignKeysMethod: 'auto',
  });
};

exports.down = function (knex) {
  return alterTableWithBuilder(knex, 'test_table', (table) => {
    table.dropColumn('json_test');
  }, {
    maxLoad: 150,
    criticalLoad: 50,
    alterForeignKeysMethod: 'auto',
  });
};
