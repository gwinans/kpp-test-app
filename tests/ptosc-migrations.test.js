'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const mysql = require('mysql2/promise');
const knexFactory = require('knex');
const { alterTableWithPtoscRaw } = require('knex-ptosc-plugin');
const knexfile = require('../knexfile');
const { createPtoscOptions, getMetricsRegistry, startMetricsServer } = require('../src/ptosc-options');

const baseConfig = knexfile.development.connection;

let adminConnection;
let knex;
let databaseName;
let mysqlAvailable = true;
let setupError;

async function skipIfUnavailable(t) {
  if (!mysqlAvailable) {
    t.skip(`MySQL unavailable: ${setupError ? setupError.message : 'connection failed'}`);
    return true;
  }
  return false;
}

test.before(async () => {
  const adminConfig = {
    host: baseConfig.host || '127.0.0.1',
    user: baseConfig.user,
    password: baseConfig.password,
    port: baseConfig.port,
    socketPath: baseConfig.socketPath
  };

  try {
    adminConnection = await mysql.createConnection(adminConfig);
    databaseName = `${baseConfig.database}_itest_${Date.now()}`;
    await adminConnection.query(`CREATE DATABASE \`${databaseName}\``);

    knex = knexFactory({
      ...knexfile.development,
      connection: {
        ...knexfile.development.connection,
        database: databaseName
      }
    });

    await knex.migrate.latest();
    await knex.seed.run();
    startMetricsServer(0);
  } catch (err) {
    mysqlAvailable = false;
    setupError = err;
    if (knex) {
      await knex.destroy();
      knex = null;
    }
    if (adminConnection) {
      try {
        await adminConnection.end();
      } catch {}
      adminConnection = null;
    }
  }
});

test.after(async () => {
  if (knex) {
    await knex.destroy();
  }
  if (adminConnection && databaseName) {
    try {
      await adminConnection.query(`DROP DATABASE IF EXISTS \`${databaseName}\``);
    } finally {
      await adminConnection.end();
    }
  }
});

test('migrations produce expected relational schema state', async (t) => {
  if (await skipIfUnavailable(t)) return;

  const [{ total_orders }] = await knex('orders').count('* as total_orders');
  assert.ok(total_orders > 75, 'expected seeded orders to exceed 75');

  const [{ total_snapshots }] = await knex('inventory_snapshots').count('* as total_snapshots');
  assert.ok(total_snapshots >= 450, 'expected at least 450 inventory snapshots');

  const fkConstraints = await knex('information_schema.referential_constraints')
    .select('constraint_name', 'table_name')
    .where({ constraint_schema: databaseName });
  const orderFk = fkConstraints.find(
    (row) => typeof row.constraint_name === 'string' && row.constraint_name.includes('orders_ibfk')
  );
  assert.ok(orderFk, 'expected orders table to retain foreign key to customers');

  const orderIndexes = await knex.raw('SHOW INDEX FROM orders');
  const indexRows = Array.isArray(orderIndexes[0]) ? orderIndexes[0] : orderIndexes;
  const hasCompositeIndex = indexRows.some((idx) => idx.Key_name === 'orders_customer_placed_idx' && idx.Seq_in_index === 2);
  assert.ok(hasCompositeIndex, 'expected composite index on orders(customer_id, placed_at)');

  const gadgetsColumn = await knex('information_schema.columns')
    .select('column_type')
    .where({
      table_schema: databaseName,
      table_name: 'gadgets',
      column_name: 'status'
    })
    .first();
  assert.ok(gadgetsColumn.column_type.includes('enum'), 'expected gadgets.status to remain an enum');
});

test('pt-osc logs are captured via structured logger and metrics', async (t) => {
  if (await skipIfUnavailable(t)) return;

  const logLines = [];
  const mockPtoscPath = path.join(__dirname, '..', 'scripts', 'mock-ptosc.js');

  await alterTableWithPtoscRaw(
    knex,
    'ALTER TABLE gadgets MODIFY COLUMN title VARCHAR(255) NOT NULL',
    createPtoscOptions('gadgets_adjust_title', {
      logger: {
        log: (msg) => logLines.push(msg),
        error: (msg) => logLines.push(`ERR:${msg}`)
      },
      ptoscPath: mockPtoscPath,
      forcePtosc: true
    })
  );

  assert.ok(logLines.some((line) => line.includes('[PT-OSC] Running:')));
  assert.ok(logLines.some((line) => line.includes('100%')));
  assert.ok(logLines.some((line) => line.includes('Statistics')) || logLines.some((line) => line.includes('# chunk-size')));

  const registry = getMetricsRegistry();
  if (registry) {
    const metric = registry.getSingleMetric && registry.getSingleMetric('ptosc_progress_percent');
    if (metric) {
      const values = metric.get().values || [];
      const hasGaugeValue = values.some((value) => value.value === 100);
      assert.ok(hasGaugeValue, 'expected progress gauge to reach 100');
    }
  }

  const columnInfo = await knex('information_schema.columns')
    .select('character_maximum_length')
    .where({
      table_schema: databaseName,
      table_name: 'gadgets',
      column_name: 'title'
    })
    .first();
  assert.equal(columnInfo.character_maximum_length, 255);
});
