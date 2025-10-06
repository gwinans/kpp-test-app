# kpp-test-app

A companion project for exercising the [`knex-ptosc-plugin`](https://github.com/gwinans/knex-ptosc-plugin/) against realistic
schemas and data volumes. The repository now bundles:

- Rich sample schemas with foreign keys, composite indexes, and warehouse-level inventory snapshots.
- Deterministic seed fixtures that populate hundreds of orders and time-series rows for before/after comparisons.
- Structured logging plus optional Prometheus metrics so you can observe `pt-online-schema-change` runs.
- A small CLI (`bin/ptosc-toolkit.js`) that wraps common workflows like migrations, dry runs, and validation.
- Node integration tests that execute real migrations through the plugin (including enum changes) and assert both schema state and
  captured pt-osc logs.
- CI automation that spins up MySQL, runs migrations with the plugin, and exposes logs for debugging failures.

## Prerequisites

- Node.js 18+
- MySQL 8.0+ (local install or Docker). The defaults expect `root` / `test` with database `ptosc`.
- [`pt-online-schema-change`](https://www.percona.com/doc/percona-toolkit/) if you plan to run against a real Percona Toolkit
  install. The integration tests also provide a deterministic `scripts/mock-ptosc.js` shim for environments without the binary.
- Optional: Docker/Docker Compose for the provided environment recipe and Prometheus monitoring stack.

Connection details can be overridden with the usual environment variables: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, and
`DB_NAME`.

## Quick start with Docker Compose

```bash
# Launch MySQL and Prometheus locally
docker compose up -d

# Wait for MySQL to become healthy and run migrations + seeds
npm run db:wait
npm run migrate
npm run seed
```

With the containers running you can export `ENABLE_PTOSC_METRICS=true` (default) to expose metrics at `http://localhost:9464`.
Prometheus is configured via `ops/prometheus.yml` to scrape that endpoint automatically when using Docker Desktop.

## CLI workflow recipes

All of the project automation routes through `npm` scripts backed by `bin/ptosc-toolkit.js`:

| Command | Description |
| --- | --- |
| `npm run migrate` | Apply the latest migrations using the pt-osc aware helpers (metrics enabled by default). |
| `npm run rollback` | Roll back the most recent migration batch. |
| `npm run seed` | Load deterministic sample data defined in `fixtures/`. |
| `npm run ptosc:plan` | List pending migrations without executing them. |
| `npm run ptosc:dry-run` | Execute migrations against an ephemeral database clone (drops the clone after completion unless `PTOSC_KEEP_DRYRUN_DB=true`). |
| `npm run ptosc:validate` | Run the integration test suite (`node --test`) to verify migrations, plugin behaviour, and observability wiring. |
| `npm run db:wait` | Block until the configured MySQL instance is available (useful in CI or when booting Docker). |

Set `RUN_SEEDS_AFTER_MIGRATE=true` to automatically seed after migrations, or `RUN_SEEDS_IN_DRY_RUN=true` to seed dry-run clones.

## Seeding & fixtures

Deterministic fixtures live under `fixtures/` (`warehouses.json`, `gadgets.json`, `customers.json`). The seed script builds a
realistic workload:

- Hundreds of orders distributed across multiple customers.
- Thousands of `order_items` rows referencing composite indexes.
- Thirty days of inventory snapshots per gadget/warehouse pair.

This data volume helps surface pt-osc edge cases such as chunk sizing and ETA reporting.

## Observability

The helper in `src/ptosc-options.js` provides structured logging via [`pino`](https://github.com/pinojs/pino) and optional metrics via
[`prom-client`](https://github.com/siimon/prom-client):

- Progress updates emit JSON logs (`event=ptosc_progress`) and are mirrored to a Prometheus gauge (`ptosc_progress_percent`).
- Final statistics from pt-osc runs are captured and logged for later inspection.
- `startMetricsServer()` exposes metrics on port `9464` by default; set `METRICS_PORT` to override or `ENABLE_PTOSC_METRICS=false`
  to disable metric emission entirely.

When running with Docker Compose, Prometheus scrapes the metrics endpoint automatically (see `ops/prometheus.yml`). For local
experiments you can also hit `curl localhost:9464/metrics` to inspect the latest values.

## Integration tests

`npm run ptosc:validate` runs the integration suite in `tests/`:

- Spins up a dedicated database schema per run.
- Executes every migration, seeds repeatable fixtures, and verifies relational integrity (foreign keys, composite indexes, enum state).
- Forces `alterTableWithPtosc` through a deterministic mock pt-osc binary to assert on captured progress logs and statistics while
  still applying the actual `ALTER TABLE` back to MySQL.
- Confirms that the Prometheus gauge records 100% completion for each run.

If MySQL is unavailable the tests are skipped with a helpful message. The GitHub Action (see `.github/workflows/ci.yml`) provisions a
MySQL 8.0 service and runs the full suite on every push/PR.

## Troubleshooting

- **MySQL connection errors** – ensure the credentials in `knexfile.js` match your environment or export `DB_*` variables.
- **pt-osc binary missing** – install Percona Toolkit locally or set `PTOSC_PATH` when calling the CLI. The helper in
  `src/ptosc-options.js` automatically falls back to `scripts/mock-ptosc.js` whenever `pt-online-schema-change` is not
  discoverable on your `PATH` (unless you set `PTOSC_ALLOW_MOCK=false`). This keeps CI/local development productive while
  still allowing you to require the real binary when desired.
- **Metrics not visible** – confirm `ENABLE_PTOSC_METRICS` is not set to `false` and that port `9464` is reachable. When using Docker
  on Linux you may need to update `ops/prometheus.yml` to point at the host IP rather than `host.docker.internal`.
- **Dry-run schema leftovers** – set `PTOSC_KEEP_DRYRUN_DB=false` (default) so the toolkit drops ephemeral databases after execution.

## Validating migrations before promotion

1. Run `npm run ptosc:plan` to review pending migrations.
2. Execute `npm run ptosc:dry-run` to rehearse against an isolated database clone.
3. Inspect the generated logs (JSON structured with progress) and, if metrics are enabled, open the Prometheus UI at
   `http://localhost:9090` and query `ptosc_progress_percent`.
4. Once satisfied, run `npm run migrate` followed by `npm run seed` and `npm run ptosc:validate` to ensure the integration tests pass.

These steps mimic the CI workflow and help catch enum changes, constraint adjustments, and long-running pt-osc migrations before they
reach production.
