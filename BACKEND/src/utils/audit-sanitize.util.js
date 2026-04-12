/**
 * Remove ou mascara dados sensíveis antes de persistir em AuditLog (newData/oldData).
 */

const SENSITIVE_KEYS = new Set([
  'password',
  'currentPassword',
  'confirmPassword',
  'newPassword',
  'oldPassword',
  'refreshToken',
  'token',
  'accessToken',
  'secret',
  'apiKey',
  'api_key',
  'clientSecret',
  'authorization',
  'creditCard',
  'credit_card',
  'cvv',
  'iban',
]);

const MAX_DEPTH = 8;
const MAX_STRING = 4000;
const EMAIL_MASK_KEEP = 3;

function maskEmail(email) {
  if (typeof email !== 'string' || !email.includes('@')) return '***';
  const [local, domain] = email.split('@');
  const safeLocal = local.length <= EMAIL_MASK_KEEP
    ? `${local[0] || '*'}***`
    : `${local.slice(0, EMAIL_MASK_KEEP)}***`;
  return `${safeLocal}@${domain}`;
}

/**
 * @param {unknown} value
 * @param {number} depth
 * @returns {unknown}
 */
function sanitizeForAudit(value, depth = 0) {
  if (value == null) return value;
  if (depth > MAX_DEPTH) return '[truncated-depth]';

  if (typeof value === 'string') {
    if (value.length > MAX_STRING) return `${value.slice(0, MAX_STRING)}…[truncated]`;
    return value;
  }

  if (typeof value !== 'object') return value;

  if (Array.isArray(value)) {
    return value.slice(0, 200).map((item) => sanitizeForAudit(item, depth + 1));
  }

  const out = {};
  for (const [key, v] of Object.entries(value)) {
    const lower = key.toLowerCase();
    if (SENSITIVE_KEYS.has(lower) || SENSITIVE_KEYS.has(key)) {
      out[key] = '[redacted]';
      continue;
    }
    if (lower === 'email' && typeof v === 'string') {
      out[key] = maskEmail(v);
      continue;
    }
    out[key] = sanitizeForAudit(v, depth + 1);
  }
  return out;
}

module.exports = {
  sanitizeForAudit,
  maskEmail,
  SENSITIVE_KEYS,
};
