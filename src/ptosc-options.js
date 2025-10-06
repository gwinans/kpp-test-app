'use strict';

const http = require('node:http');
const pino = require('pino');
const client = require('prom-client');

const DEFAULT_LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const METRICS_ENV = process.env.ENABLE_PTOSC_METRICS;
const METRICS_ENABLED = METRICS_ENV == null || METRICS_ENV.toLowerCase() === 'true';

let baseLogger;
let registry;
let progressGauge;
let metricsServer;

function getBaseLogger() {
  if (!baseLogger) {
    baseLogger = pino({
      level: DEFAULT_LOG_LEVEL,
      messageKey: 'message',
      base: { service: 'kpp-test-app' }
    });
  }
  return baseLogger;
}

function ensureRegistry() {
  if (!registry) {
    registry = new client.Registry();
    client.collectDefaultMetrics({ register: registry });
    progressGauge = new client.Gauge({
      name: 'ptosc_progress_percent',
      help: 'Progress percentage reported by pt-online-schema-change',
      registers: [registry],
      labelNames: ['migration']
    });
  }
  return registry;
}

function getProgressGauge() {
  if (!METRICS_ENABLED) {
    return null;
  }
  if (!progressGauge) {
    ensureRegistry();
  }
  return progressGauge;
}

function normalizeLogger(migrationName, overrides) {
  if (overrides && overrides.log && overrides.error) {
    return overrides;
  }
  const logger = getBaseLogger().child({ migration: migrationName });
  return {
    log(message) {
      logger.info({ event: 'ptosc_log', message });
    },
    error(message) {
      logger.error({ event: 'ptosc_error', message });
    },
    _pino: logger
  };
}

function createPtoscOptions(migrationName, overrides = {}) {
  const { logger: loggerOverride, onProgress: onProgressOverride, onStatistics: onStatisticsOverride, ...rest } = overrides;
  const logger = normalizeLogger(migrationName, loggerOverride);
  const gauge = getProgressGauge();

  const onProgress = (pct, eta) => {
    if (logger._pino) {
      logger._pino.info({ event: 'ptosc_progress', pct, eta: eta || null }, 'pt-osc progress');
    } else {
      logger.log(`[PT-OSC] ${pct}%${eta ? ` ETA ${eta}` : ''}`);
    }
    if (gauge) {
      gauge.set({ migration: migrationName }, pct);
    }
    if (typeof onProgressOverride === 'function') {
      onProgressOverride(pct, eta);
    }
  };

  const onStatistics = (stats) => {
    if (logger._pino) {
      logger._pino.info({ event: 'ptosc_statistics', stats });
    } else {
      logger.log(`[PT-OSC] stats: ${JSON.stringify(stats)}`);
    }
    if (typeof onStatisticsOverride === 'function') {
      onStatisticsOverride(stats);
    }
  };

  const options = {
    logger,
    onProgress,
    statistics: true,
    onStatistics,
    ...rest
  };

  return options;
}

function startMetricsServer(port = Number(process.env.METRICS_PORT) || 9464) {
  if (!METRICS_ENABLED) {
    return null;
  }
  if (metricsServer) {
    return metricsServer;
  }
  const register = ensureRegistry();
  metricsServer = http.createServer(async (req, res) => {
    if (req.url === '/metrics') {
      try {
        const metrics = await register.metrics();
        res.statusCode = 200;
        res.setHeader('Content-Type', register.contentType);
        res.end(metrics);
      } catch (err) {
        res.statusCode = 500;
        res.end(err.message);
      }
      return;
    }
    res.statusCode = 404;
    res.end('Not Found');
  });

  metricsServer.listen(port, () => {
    const address = metricsServer.address();
    const boundPort = typeof address === 'object' && address ? address.port : port;
    getBaseLogger().info({ event: 'metrics_server_started', port: boundPort }, 'pt-osc metrics server ready');
  });
  metricsServer.unref();

  return metricsServer;
}

function getMetricsRegistry() {
  return registry;
}

module.exports = {
  createPtoscOptions,
  startMetricsServer,
  getMetricsRegistry,
  getBaseLogger
};
