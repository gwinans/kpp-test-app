#!/usr/bin/env node
'use strict';

const process = require('node:process');
const mysql = require('mysql2/promise');

const host = process.env.DB_HOST || '127.0.0.1';
const user = process.env.DB_USER || 'root';
const password = process.env.DB_PASSWORD || 'test';
const port = Number(process.env.DB_PORT || 3306);
const timeoutMs = Number(process.env.DB_WAIT_TIMEOUT_MS || 120000);
const retryMs = Number(process.env.DB_WAIT_RETRY_MS || 2000);

async function waitForMysql() {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    let connection;
    try {
      connection = await mysql.createConnection({ host, user, password, port });
      await connection.ping();
      await connection.end();
      console.log('MySQL is ready.');
      return process.exit(0);
    } catch (err) {
      if (connection) {
        try { await connection.end(); } catch {}
      }
      console.log(`Waiting for MySQL at ${host}:${port} (${err.code || err.message})...`);
      await new Promise((resolve) => setTimeout(resolve, retryMs));
    }
  }
  console.error('MySQL did not become available before timeout.');
  process.exit(1);
}

waitForMysql();
