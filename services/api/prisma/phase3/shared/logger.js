const crypto = require('crypto');

const LEVELS = { ERROR: 0, WARN: 1, INFO: 2, DEBUG: 3 };
const CURRENT_LEVEL = LEVELS[process.env.LOG_LEVEL] !== undefined ? LEVELS[process.env.LOG_LEVEL] : LEVELS.INFO;

function createLogger(serviceName) {
  return {
    service: serviceName,
    child(context) { return createLogger(serviceName, context); },
    error(msg, meta = {}) { if (CURRENT_LEVEL >= LEVELS.ERROR) this._log('ERROR', msg, meta); },
    warn(msg, meta = {}) { if (CURRENT_LEVEL >= LEVELS.WARN) this._log('WARN', msg, meta); },
    info(msg, meta = {}) { if (CURRENT_LEVEL >= LEVELS.INFO) this._log('INFO', msg, meta); },
    debug(msg, meta = {}) { if (CURRENT_LEVEL >= LEVELS.DEBUG) this._log('DEBUG', msg, meta); },
    _log(severity, msg, meta = {}) {
      const entry = {
        timestamp: new Date().toISOString(),
        severity,
        service: serviceName,
        message: msg,
        ...meta,
      };
      const output = JSON.stringify(entry);
      if (severity === 'ERROR') process.stderr.write(output + '\n');
      else process.stdout.write(output + '\n');
    },
  };
}

function correlationId(req, res, next) {
  req.correlationId = req.headers['x-correlation-id'] || crypto.randomUUID();
  res.setHeader('x-correlation-id', req.correlationId);
  next();
}

module.exports = { createLogger, correlationId };
