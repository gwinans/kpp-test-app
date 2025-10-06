#!/usr/bin/env node
'use strict';

const { spawnSync } = require('node:child_process');
const path = require('node:path');
const process = require('node:process');
const mysql = require('mysql2/promise');
const knexFactory = require('knex');
const knexfile = require('../knexfile.js');
const { startMetricsServer, getBaseLogger } = require('../src/ptosc-options.js');

const commands = new Set(['migrate', 'rollback', 'plan', 'seed', 'dry-run', 'validate']);

async function run() {
  const command = process.argv[2];
  if (!commands.has(command)) {
    printHelp();
    process.exit(command ? 1 : 0);
  }

  if (process.env.ENABLE_PTOSC_METRICS !== 'false') {
    startMetricsServer();
  }

  switch (command) {
    case 'migrate':
      await runMigrations();
      break;
    case 'rollback':
      await runRollback();
      break;
    case 'plan':
      await runPlan();
      break;
    case 'seed':
      await runSeed();
      break;
    case 'dry-run':
      await runDryRun();
      break;
    case 'validate':
      await runValidate();
      break;
  }
}

function getConnectionConfig() {
  const cfg = knexfile.development;
  return { ...cfg, connection: { ...cfg.connection } };
}

async function createKnex(connectionOverride) {
  const cfg = getConnectionConfig();
  if (connectionOverride) {
    cfg.connection = { ...cfg.connection, ...connectionOverride };
  }
  return knexFactory(cfg);
}

async function runMigrations(connectionOverride) {
  const knex = await createKnex(connectionOverride);
  try {
    await knex.migrate.latest();
    if (process.env.RUN_SEEDS_AFTER_MIGRATE === 'true') {
      await knex.seed.run();
    }
    getBaseLogger().info({ command: 'migrate' }, 'Migrations complete');
  } finally {
    await knex.destroy();
  }
}

async function runRollback() {
  const knex = await createKnex();
  try {
    await knex.migrate.rollback(undefined, true);
    getBaseLogger().info({ command: 'rollback' }, 'Rollback complete');
  } finally {
    await knex.destroy();
  }
}

async function runPlan() {
  const knex = await createKnex();
  try {
    let pending;
    try {
      [, pending] = await knex.migrate.list();
    } catch (err) {
      console.warn('Unable to inspect migrations:', err.message);
      return;
    }
    if (!pending.length) {
      console.log('No pending migrations.');
    } else {
      console.log('Pending migrations:');
      pending.forEach((file) => console.log(` • ${path.basename(file.file)}`));
    }
  } finally {
    await knex.destroy();
  }
}

async function runSeed(connectionOverride) {
  const knex = await createKnex(connectionOverride);
  try {
    await knex.seed.run();
    getBaseLogger().info({ command: 'seed' }, 'Seed data applied');
  } finally {
    await knex.destroy();
  }
}

async function runDryRun() {
  const cfg = getConnectionConfig();
  const dbName = `${cfg.connection.database}_dryrun_${Date.now()}`;
  const adminConnection = { ...cfg.connection };
  delete adminConnection.database;

  const admin = await mysql.createConnection(adminConnection);
  const logger = getBaseLogger();
  const keepDatabase = process.env.PTOSC_KEEP_DRYRUN_DB === 'true';
  try {
    await admin.query(`CREATE DATABASE \`${dbName}\``);
    logger.info({ command: 'dry-run', database: dbName }, 'Created dry-run database');
    await runMigrations({ database: dbName });
    if (process.env.RUN_SEEDS_IN_DRY_RUN === 'true') {
      await runSeed({ database: dbName });
    }
  } finally {
    await admin.end();
    if (keepDatabase) {
      logger.warn({ command: 'dry-run', database: dbName }, 'Keeping dry-run database for inspection');
      return;
    }
    const dropConn = await mysql.createConnection(adminConnection);
    try {
      await dropConn.query(`DROP DATABASE IF EXISTS \`${dbName}\``);
      logger.info({ command: 'dry-run', database: dbName }, 'Dry-run database dropped');
    } finally {
      await dropConn.end();
    }
  }
}

async function runValidate() {
  const result = spawnSync(process.execPath, ['--test', 'tests'], {
    stdio: 'inherit',
    env: process.env
  });
  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

function printHelp() {
  console.log('Usage: npm run <script>');
  console.log('Available scripts:');
  console.log('  npm run migrate         Run pending migrations with pt-osc integration');
  console.log('  npm run rollback        Roll back the last migration batch');
  console.log('  npm run seed            Load deterministic sample data fixtures');
  console.log('  npm run ptosc:plan      Show pending migrations without executing them');
  console.log('  npm run ptosc:dry-run   Execute migrations against a temporary database');
  console.log('  npm run ptosc:validate  Run integration tests against pt-osc flows');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
