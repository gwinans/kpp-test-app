/**
 * Change the data type of json_test column in test_table from json -> longtext
 * This migration should use pt-online-schema-change, as column datatypes cannot be changed instantly
 */

const { alterTableWithPtosc } = require('knex-ptosc-plugin');

exports.up = function (knex) {
  return alterTableWithPtosc(knex, 'test_table', (table) => {
    table.text('json_test', 'longtext').alter();
  }, {
    maxLoad: 150,
    criticalLoad: 50,
    alterForeignKeysMethod: 'auto',
    statistics: true,
    debug: true
  });
};

exports.down = function (knex) {
  return alterTableWithPtosc(knex, 'test_table', (table) => {
    table.json('json_test').alter();
  }, {
    maxLoad: 150,
    criticalLoad: 50,
    alterForeignKeysMethod: 'auto',
  });
};
