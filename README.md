# kpp-test-app

Test app for knex-ptosc-plugin

This project demonstrates Knex migrations using a MySQL database.

## Migrations

Ensure you have a MySQL server running and a database (default `test_db`) available. Connection settings can be customized via environment variables: `DB_HOST`, `DB_USER`, `DB_PASSWORD`, and `DB_NAME`. By default the app connects with user `testuser` and password `password`.

Run the latest migrations:

```bash
npm run migrate
```

Rollback the last batch:

```bash
npm run rollback
```

The migration files live in the `migrations/` directory and are configured via `knexfile.js`.
