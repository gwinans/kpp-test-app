'use strict';

const http = require('node:http');
const path = require('node:path');
const fs = require('node:fs');
const pino = require('pino');
const client = require('prom-client');

const DEFAULT_LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const METRICS_ENV = process.env.ENABLE_PTOSC_METRICS;
const METRICS_ENABLED = METRICS_ENV == null || METRICS_ENV.toLowerCase() === 'true';
const DEFAULT_PTOSC_BINARY = process.env.PTOSC_BINARY || 'pt-online-schema-change';
const ALLOW_PTOSC_MOCK = process.env.PTOSC_ALLOW_MOCK !== 'false';

let fallbackNoticeLogged = false;

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

function commandExists(candidate) {
  if (!candidate) {
    return false;
  }
  try {
    fs.accessSync(candidate, fs.constants.X_OK);
    return true;
  } catch (err) {
    // continue to PATH lookup below
  }

  if (candidate.includes(path.sep)) {
    return false;
  }

  const pathEntries = process.env.PATH ? process.env.PATH.split(path.delimiter) : [];
  const extensions = process.platform === 'win32'
    ? (process.env.PATHEXT || '.EXE;.CMD;.BAT;.COM').split(';')
    : [''];

  for (const dir of pathEntries) {
    for (const ext of extensions) {
      const maybe = path.join(dir, `${candidate}${ext}`);
      try {
        fs.accessSync(maybe, fs.constants.X_OK);
        return true;
      } catch {
        continue;
      }
    }
  }
  return false;
}

function resolvePtoscPath(ptoscPathOverride) {
  if (ptoscPathOverride) {
    return ptoscPathOverride;
  }
  if (process.env.PTOSC_PATH) {
    return process.env.PTOSC_PATH;
  }
  if (commandExists(DEFAULT_PTOSC_BINARY)) {
    return DEFAULT_PTOSC_BINARY;
  }
  if (ALLOW_PTOSC_MOCK) {
    if (!fallbackNoticeLogged) {
      getBaseLogger().warn(
        { event: 'ptosc_mock_fallback', binary: DEFAULT_PTOSC_BINARY },
        'pt-online-schema-change binary not found; falling back to mock implementation'
      );
      fallbackNoticeLogged = true;
    }
    return path.join(__dirname, '..', 'scripts', 'mock-ptosc.js');
  }
  if (!fallbackNoticeLogged) {
    getBaseLogger().error(
      { event: 'ptosc_binary_missing', binary: DEFAULT_PTOSC_BINARY },
      'pt-online-schema-change binary not found and mock fallback disabled'
    );
    fallbackNoticeLogged = true;
  }
  return DEFAULT_PTOSC_BINARY;
}

function createPtoscOptions(migrationName, overrides = {}) {
  const {
    logger: loggerOverride,
    onProgress: onProgressOverride,
    onStatistics: onStatisticsOverride,
    ptoscPath: ptoscPathOverride,
    ...rest
  } = overrides;
  const logger = normalizeLogger(migrationName, loggerOverride);
  const gauge = getProgressGauge();
  const ptoscPath = resolvePtoscPath(ptoscPathOverride);

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

  if (ptoscPath) {
    options.ptoscPath = ptoscPath;
  }

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
