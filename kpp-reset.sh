#!/usr/bin/env bash

MYSQL_PWD=test mysql -uroot ptosc -e "DROP TABLE IF EXISTS gadgets; DROP TABLE IF EXISTS widgets; TRUNCATE TABLE knex_migrations; UPDATE knex_migrations_lock SET is_locked = 0;"
rm -rf node_modules/knex-ptosc-plugin
mkdir node_modules/knex-ptosc-plugin
cp -r ../knex-ptosc-plugin/* node_modules/knex-ptosc-plugin/
