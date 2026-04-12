import api from './api';

const base = '/support-groups';

export async function getActiveSupportGroups() {
  const { data } = await api.get(`${base}/active`);
  return data;
}

export async function getAllSupportGroups() {
  const { data } = await api.get(base);
  return data;
}

export async function createSupportGroup(payload) {
  const { data } = await api.post(base, payload);
  return data;
}

export async function updateSupportGroup(id, payload) {
  const { data } = await api.patch(`${base}/${id}`, payload);
  return data;
}

export async function deactivateSupportGroup(id) {
  await api.delete(`${base}/${id}`);
}
