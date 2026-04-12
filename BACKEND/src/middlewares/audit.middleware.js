const AuditLogRepository = require('../repositories/audit-log.repository');
const logger = require('../config/logger');
const { sanitizeForAudit } = require('../utils/audit-sanitize.util');

/**
 * Deriva ação canónica quando o segundo argumento de audit() não é passado.
 */
function deriveAction(method, explicitAction) {
  if (explicitAction != null && explicitAction !== '') {
    return explicitAction;
  }
  const m = (method || 'GET').toUpperCase();
  if (m === 'POST') return 'CREATE';
  if (m === 'PUT' || m === 'PATCH') return 'UPDATE';
  if (m === 'DELETE') return 'DELETE';
  if (m === 'GET') return 'READ';
  return 'OPERATION';
}

function buildAuditPayload(req, module, resolvedAction, body) {
  const entityId =
    req.auditContext?.entityId ||
    req.params?.id ||
    req.params?.ticketId ||
    req.params?.minuteId ||
    req.params?.costId ||
    (body && typeof body === 'object' && body.id) ||
    null;

  const rawNew =
    req.auditContext?.newData !== undefined
      ? req.auditContext.newData
      : resolvedAction !== 'DELETE'
        ? body
        : null;

  return {
    action: `${module}_${resolvedAction}`,
    entityType: module,
    entityId: entityId != null ? String(entityId) : null,
    userId: req.user?.userId || null,
    module,
    oldData: req.auditContext?.oldData != null ? sanitizeForAudit(req.auditContext.oldData) : null,
    newData: rawNew != null ? sanitizeForAudit(rawNew) : null,
    ipAddress: req.ip || req.connection?.remoteAddress || null,
    userAgent: req.get('user-agent') || null,
  };
}

function scheduleAudit(req, res, module, resolvedAction, body) {
  if (res.statusCode < 200 || res.statusCode >= 300) return;
  if (!req.prisma) {
    logger.warn('[AuditMiddleware] req.prisma not available, skipping audit log');
    return;
  }
  if (!req.user?.userId) {
    logger.debug('[AuditMiddleware] skip: no userId on request');
    return;
  }

  const auditData = buildAuditPayload(req, module, resolvedAction, body);

  AuditLogRepository.create(req.prisma, auditData).catch((err) => {
    logger.error('[AuditMiddleware] Falha ao registrar audit log:', err.message);
  });
}

/**
 * @param {string} module - Módulo RBAC (ex.: PROJECTS, HELPDESK)
 * @param {string} [action] - Se omitido, deriva de POST/PUT/PATCH/DELETE
 */
const audit = (module, action) => {
  return (req, res, next) => {
    const resolvedAction = deriveAction(req.method, action);

    const originalJson = res.json.bind(res);
    const originalSend = res.send.bind(res);

    /** Express `res.json` chama `res.send` internamente — evitar duplicar linhas em AuditLog */
    let auditWritten = false;
    const once = (body) => {
      if (auditWritten) return;
      auditWritten = true;
      scheduleAudit(req, res, module, resolvedAction, body);
    };

    res.json = function jsonWrapped(body) {
      once(body);
      return originalJson(body);
    };

    res.send = function sendWrapped(body) {
      once(body);
      return originalSend(body);
    };

    next();
  };
};

module.exports = { audit, deriveAction };
