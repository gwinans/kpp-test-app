/**
 * Link gadgets to warehouses to exercise foreign key changes via pt-osc.
 */
const { alterTableWithPtosc, alterTableWithPtoscRaw } = require('knex-ptosc-plugin');
const { createPtoscOptions } = require('../src/ptosc-options');

exports.up = async function (knex) {
  await alterTableWithPtosc(
    knex,
    'gadgets',
    (table) => {
      table.integer('warehouse_id').unsigned().nullable().index('gadgets_warehouse_idx');
    },
    createPtoscOptions('gadgets_add_warehouse_id')
  );

  await alterTableWithPtoscRaw(
    knex,
    'ALTER TABLE gadgets ADD CONSTRAINT gadgets_warehouse_fk FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE SET NULL',
    createPtoscOptions('gadgets_add_warehouse_fk')
  );
};

exports.down = async function (knex) {
  await alterTableWithPtoscRaw(
    knex,
    'ALTER TABLE gadgets DROP FOREIGN KEY gadgets_warehouse_fk',
    createPtoscOptions('gadgets_drop_warehouse_fk')
  );

  await alterTableWithPtosc(
    knex,
    'gadgets',
    (table) => {
      table.dropIndex('warehouse_id', 'gadgets_warehouse_idx');
    },
    createPtoscOptions('gadgets_drop_warehouse_idx')
  );

  await alterTableWithPtosc(
    knex,
    'gadgets',
    (table) => {
      table.dropColumn('warehouse_id');
    },
    createPtoscOptions('gadgets_remove_warehouse_id')
  );
};
