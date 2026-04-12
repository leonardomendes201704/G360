const logger = require('../config/logger');

/**
 * Regista eventos de segurança (401/403/429) apenas via Winston (`logs/security.log` + consola).
 * Evita duplicar escrita manual em ficheiro — o transporte `security.log` em `config/logger.js` já agrega warns.
 */
const writeSecurityLog = (logData) => {
  logger.warn('[SECURITY_EVENT]', { category: 'SECURITY', ...logData });
};

// Middleware de Security Logging
const securityLogger = (req, res, next) => {
  const originalSend = res.send;
  const originalJson = res.json;

  let logged = false;
  const once = () => {
    if (logged) return;
    logged = true;
    logSecurityEvent(req, res);
  };

  res.json = function (data) {
    once();
    return originalJson.apply(res, arguments);
  };

  res.send = function (data) {
    once();
    return originalSend.apply(res, arguments);
  };

  next();
};

// Função auxiliar para logar eventos de segurança
function logSecurityEvent(req, res) {
  if ([401, 403, 429].includes(res.statusCode)) {
    const logData = {
      type: getEventType(res.statusCode),
      ip: req.ip || req.connection.remoteAddress,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      user: req.user?.email || 'anonymous',
      userAgent: req.get('user-agent'),
      referer: req.get('referer') || null,
    };

    writeSecurityLog(logData);
  }
}

function getEventType(statusCode) {
  switch (statusCode) {
    case 401:
      return 'UNAUTHORIZED_ACCESS';
    case 403:
      return 'FORBIDDEN_ACCESS';
    case 429:
      return 'RATE_LIMIT_EXCEEDED';
    default:
      return 'SECURITY_EVENT';
  }
}

const logFailedLogin = (req, email, reason) => {
  writeSecurityLog({
    type: 'FAILED_LOGIN',
    ip: req.ip || req.connection.remoteAddress,
    email,
    reason,
    userAgent: req.get('user-agent'),
  });
};

const logBlockedUpload = (req, filename, mimetype, reason) => {
  writeSecurityLog({
    type: 'BLOCKED_UPLOAD',
    ip: req.ip,
    filename,
    mimetype,
    reason,
    user: req.user?.email || 'anonymous',
  });
};

module.exports = {
  securityLogger,
  logFailedLogin,
  logBlockedUpload,
  writeSecurityLog,
};
