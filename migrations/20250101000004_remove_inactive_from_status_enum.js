/**
 * Remove 'inactive' from the status enum on widgets.
 */
const { alterTableWithPtosc } = require('knex-ptosc-plugin');

exports.up = function (knex) {
  return alterTableWithPtosc(knex, 'widgets', (table) => {
    table
      .enu('status', ['active', 'pending'])
      .notNullable()
      .defaultTo('active')
      .alter();
  });
};

exports.down = function (knex) {
  return alterTableWithPtosc(knex, 'widgets', (table) => {
    table
      .enu('status', ['active', 'inactive', 'pending'])
      .notNullable()
      .defaultTo('active')
      .alter();
  });
};
