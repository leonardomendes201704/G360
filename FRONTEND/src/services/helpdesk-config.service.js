import api from './api';

const base = '/helpdesk-config';

export async function getHelpdeskConfig() {
  const { data } = await api.get(base);
  return data;
}

export async function updateHelpdeskConfig(payload) {
  const { data } = await api.put(base, payload);
  return data;
}
