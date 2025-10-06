/**
 * Rename the name column to title in widgets.
 */

const { alterTableWithPtosc } = require('knex-ptosc-plugin');
const { createPtoscOptions } = require('../src/ptosc-options');

exports.up = function (knex) {
  return alterTableWithPtosc(
    knex,
    'widgets',
    (table) => {
      table.renameColumn('name', 'title');
    },
    createPtoscOptions('rename_widgets_name_to_title')
  );
};

exports.down = function (knex) {
  return alterTableWithPtosc(
    knex,
    'widgets',
    (table) => {
      table.renameColumn('title', 'name');
    },
    createPtoscOptions('rename_widgets_title_to_name')
  );
};
