#!/usr/bin/env node
'use strict';

const process = require('node:process');
const mysql = require('mysql2/promise');

function parseArgs(argv) {
  const result = { raw: argv.slice(2) };
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--alter') {
      result.alter = argv[++i];
    } else if (arg.startsWith('D=')) {
      const parts = arg.slice(2).split(',');
      for (const part of parts) {
        const [key, value] = part.split('=');
        if (key === 't') {
          result.table = value;
        } else if (key === '') {
          continue;
        } else {
          result.database = value;
        }
      }
    } else if (arg.startsWith('--host=')) {
      result.host = arg.slice(7);
    } else if (arg.startsWith('--user=')) {
      result.user = arg.slice(7);
    } else if (arg === '--port') {
      result.port = Number(argv[++i]);
    } else if (arg === '--socket') {
      result.socketPath = argv[++i];
    } else if (arg === '--dry-run') {
      result.dryRun = true;
    } else if (arg === '--execute') {
      result.execute = true;
    }
  }
  return result;
}

async function applyAlter(config, alterClause) {
  const connectionOptions = {
    host: config.host || '127.0.0.1',
    user: config.user,
    database: config.database,
    port: config.port,
    socketPath: config.socketPath,
    password: process.env.MYSQL_PWD
  };
  const connection = await mysql.createConnection(connectionOptions);
  try {
    const sql = `ALTER TABLE \`${config.table}\` ${alterClause}`;
    await connection.query(sql);
  } finally {
    await connection.end();
  }
}

async function main() {
  const parsed = parseArgs(process.argv);
  if (parsed.table) parsed.table = parsed.table.replace(/`/g, '');
  if (parsed.database) parsed.database = parsed.database.replace(/`/g, '');
  const alterClause = parsed.alter;
  if (!alterClause) {
    console.error('mock-ptosc: missing --alter clause');
    process.exit(2);
  }

  const action = parsed.dryRun ? 'dry-run' : parsed.execute ? 'execute' : 'unknown';
  const header = `[mock-ptosc] ${action} ${parsed.database}.${parsed.table}`;
  console.log(header);
  console.log('0% 00:00 remain');
  console.error('50% 00:05 remain');
  console.log('100% 00:00 remain');

  if (parsed.execute && process.env.PTOSC_DRY_RUN_ONLY !== 'true') {
    await applyAlter(parsed, alterClause);
  }

  console.log('# Event          Count');
  console.log('# copy_rows      1000');
  console.log('# chunk-size     1000');
}

main().catch((err) => {
  console.error(err.stack || err.message);
  process.exit(1);
});
