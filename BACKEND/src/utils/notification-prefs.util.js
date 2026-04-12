/**
 * Preferências de notificação por utilizador (campo User.notificationPreferences — JSON).
 * Valores por omissão: tudo activo; sem horário silencioso.
 */

const DEFAULT_PREFS = {
  inApp: true,
  emailCritical: true,
  emailApprovals: true,
  emailProjects: true,
  /** Categorias: SLA, APPROVALS, HELPDESK, GMUD, PROJECTS, INCIDENTS, FINANCE, DEFAULT */
  categories: {},
  /** Horário silencioso para e-mail (não envia durante a janela). Formato HH:mm em UTC. */
  quietHours: null,
};

function mergeNotificationPrefs(raw) {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_PREFS, categories: { ...DEFAULT_PREFS.categories } };
  }
  return {
    ...DEFAULT_PREFS,
    ...raw,
    categories: { ...DEFAULT_PREFS.categories, ...(raw.categories || {}) },
  };
}

/**
 * @param {string} [category] — chave em categories ou DEFAULT
 */
function isCategoryEnabled(prefs, category) {
  const c = category || 'DEFAULT';
  if (prefs.categories && prefs.categories[c] === false) return false;
  return true;
}

function shouldSendInApp(prefs) {
  return prefs.inApp !== false;
}

/**
 * @param {'critical'|'approvals'|'projects'} channel
 */
function shouldSendEmailChannel(prefs, channel) {
  if (channel === 'critical' && prefs.emailCritical === false) return false;
  if (channel === 'approvals' && prefs.emailApprovals === false) return false;
  if (channel === 'projects' && prefs.emailProjects === false) return false;
  return true;
}

/**
 * Mapeia categoria lógica para canal de e-mail.
 */
function emailChannelForCategory(category) {
  if (category === 'SLA' || category === 'INCIDENTS' || category === 'HELPDESK') return 'critical';
  if (category === 'APPROVALS' || category === 'FINANCE') return 'approvals';
  if (category === 'PROJECTS' || category === 'GMUD') return 'projects';
  return 'critical';
}

function parseHm(s) {
  if (!s || typeof s !== 'string') return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

/**
 * Verifica se agora (UTC) está dentro do horário silencioso.
 */
function isQuietHoursNow(prefs) {
  const qh = prefs.quietHours;
  if (!qh || typeof qh !== 'object') return false;
  const start = parseHm(qh.start);
  const end = parseHm(qh.end);
  if (start == null || end == null) return false;

  const now = new Date();
  const cur = now.getUTCHours() * 60 + now.getUTCMinutes();

  if (start < end) {
    return cur >= start && cur < end;
  }
  // cruza meia-noite (ex.: 22:00–07:00)
  return cur >= start || cur < end;
}

module.exports = {
  DEFAULT_PREFS,
  mergeNotificationPrefs,
  isCategoryEnabled,
  shouldSendInApp,
  shouldSendEmailChannel,
  emailChannelForCategory,
  isQuietHoursNow,
};
