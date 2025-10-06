/**
 * Add 'pending' to the status enum on widgets.
 */
const { alterTableWithPtosc } = require('knex-ptosc-plugin');
const { createPtoscOptions } = require('../src/ptosc-options');

exports.up = function (knex) {
  return alterTableWithPtosc(
    knex,
    'widgets',
    (table) => {
      table
        .enu('status', ['active', 'inactive', 'pending'])
        .notNullable()
        .defaultTo('active')
        .alter();
    },
    createPtoscOptions('widgets_status_add_pending')
  );
};

exports.down = function (knex) {
  return alterTableWithPtosc(
    knex,
    'widgets',
    (table) => {
      table
        .enu('status', ['active', 'inactive'])
        .notNullable()
        .defaultTo('active')
        .alter();
    },
    createPtoscOptions('widgets_status_remove_pending')
  );
};
