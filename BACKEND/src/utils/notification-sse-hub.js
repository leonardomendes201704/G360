/**
 * Hub em memória para Server-Sent Events (notificações em tempo quase real).
 * Em cluster PM2, cada instância tem o seu mapa (cliente pode precisar de sticky session ou polling de fallback).
 */

const clients = new Map();

function key(slug, userId) {
  return `${slug || 'default'}:${userId}`;
}

function register(slug, userId, res) {
  const k = key(slug, userId);
  if (!clients.has(k)) clients.set(k, new Set());
  clients.get(k).add(res);
}

function unregister(slug, userId, res) {
  const k = key(slug, userId);
  const set = clients.get(k);
  if (!set) return;
  set.delete(res);
  if (set.size === 0) clients.delete(k);
}

function emit(slug, userId, payload) {
  const k = key(slug, userId);
  const set = clients.get(k);
  if (!set || set.size === 0) return;
  const line = `data: ${JSON.stringify(payload)}\n\n`;
  for (const res of set) {
    try {
      res.write(line);
    } catch (_) {
      // conexão fechada
    }
  }
}

module.exports = {
  register,
  unregister,
  emit,
};
