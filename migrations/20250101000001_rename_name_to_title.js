/**
 * Rename the name column to title in widgets.
 */

const { alterTableWithPtoscRaw } = require('knex-ptosc-plugin');
const { createPtoscOptions } = require('../src/ptosc-options');

exports.up = function (knex) {
  return alterTableWithPtoscRaw(
    knex,
    'ALTER TABLE widgets CHANGE COLUMN `name` `title` VARCHAR(255) NOT NULL',
    createPtoscOptions('rename_widgets_name_to_title')
  );
};

exports.down = function (knex) {
  return alterTableWithPtoscRaw(
    knex,
    'ALTER TABLE widgets CHANGE COLUMN `title` `name` VARCHAR(255) NOT NULL',
    createPtoscOptions('rename_widgets_title_to_name')
  );
};
