/**
 * Create relational tables that mimic production datasets with foreign keys
 * and composite indexes.
 */

exports.up = async function (knex) {
  await knex.schema.createTable('customers', (table) => {
    table.increments('id').primary().unsigned();
    table.string('external_id').notNullable().unique();
    table.string('email').notNullable().unique();
    table.string('full_name').notNullable();
    table.enu('status', ['prospect', 'active', 'churned']).notNullable().defaultTo('prospect');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('warehouses', (table) => {
    table.increments('id').primary().unsigned();
    table.string('code').notNullable().unique();
    table.string('region').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('orders', (table) => {
    table.increments('id').primary().unsigned();
    table.string('order_number').notNullable().unique();
    table.integer('customer_id').unsigned().notNullable();
    table.bigInteger('total_cents').notNullable();
    table.enu('status', ['pending', 'processing', 'fulfilled', 'cancelled']).notNullable().defaultTo('pending');
    table.timestamp('placed_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('fulfilled_at');
    table
      .foreign('customer_id')
      .references('id')
      .inTable('customers')
      .onDelete('CASCADE');
    table.index(['customer_id', 'placed_at'], 'orders_customer_placed_idx');
    table.index(['status', 'placed_at'], 'orders_status_placed_idx');
  });

  await knex.schema.createTable('order_items', (table) => {
    table.increments('id').primary().unsigned();
    table.integer('order_id').unsigned().notNullable();
    table.integer('gadget_id').unsigned().notNullable();
    table.integer('quantity').unsigned().notNullable();
    table.bigInteger('price_cents').notNullable();
    table
      .foreign('order_id')
      .references('id')
      .inTable('orders')
      .onDelete('CASCADE');
    table
      .foreign('gadget_id')
      .references('id')
      .inTable('gadgets')
      .onDelete('CASCADE');
    table.index(['order_id', 'gadget_id'], 'order_items_order_gadget_idx');
  });

  await knex.schema.createTable('inventory_snapshots', (table) => {
    table.increments('id').primary().unsigned();
    table.integer('gadget_id').unsigned().notNullable();
    table.integer('warehouse_id').unsigned().notNullable();
    table.date('snapshot_date').notNullable();
    table.bigInteger('quantity').notNullable();
    table
      .foreign('gadget_id')
      .references('id')
      .inTable('gadgets')
      .onDelete('CASCADE');
    table
      .foreign('warehouse_id')
      .references('id')
      .inTable('warehouses')
      .onDelete('CASCADE');
    table.unique(['gadget_id', 'warehouse_id', 'snapshot_date'], 'inventory_snapshots_unique');
    table.index(['warehouse_id', 'snapshot_date'], 'inventory_snapshots_wh_snapshot_idx');
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('inventory_snapshots');
  await knex.schema.dropTableIfExists('order_items');
  await knex.schema.dropTableIfExists('orders');
  await knex.schema.dropTableIfExists('warehouses');
  await knex.schema.dropTableIfExists('customers');
};
