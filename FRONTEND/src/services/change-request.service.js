import api from './api';

export const getChanges = async (filters = {}) => {
  const params = new URLSearchParams(filters);
  const response = await api.get(`/changes?${params}`);
  return response.data;
};

export const createChange = async (data) => {
  const response = await api.post('/changes', data);
  return response.data;
};

export const updateChange = async (id, data) => {
  const response = await api.put(`/changes/${id}`, data);
  return response.data;
};

export const deleteChange = async (id) => {
  const response = await api.delete(`/changes/${id}`);
  return response.data;
};

export const addApprover = async (changeId, userId) => {
  const response = await api.post(`/changes/${changeId}/approvers`, { userId });
  return response.data;
};

export const reviewChange = async (changeId, status, comment) => {
  const response = await api.post(`/changes/${changeId}/review`, { status, comment });
  return response.data;
};

export const getAttachments = async (changeId) => {
  const response = await api.get(`/changes/${changeId}/attachments`);
  return response.data;
};

export const uploadAttachment = async (changeId, file) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post(`/changes/${changeId}/attachments`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};

export const deleteAttachment = async (id) => {
  await api.delete(`/changes/attachments/${id}`);
};

// ==========================================
// GOVERNANCE: Schedule & Conflicts
// ==========================================

export const checkScheduleConflicts = async (scheduledStart, scheduledEnd, excludeId = null) => {
  const params = new URLSearchParams({
    scheduledStart: new Date(scheduledStart).toISOString(),
    scheduledEnd: new Date(scheduledEnd).toISOString(),
  });
  if (excludeId) params.append('excludeId', excludeId);
  const response = await api.get(`/changes/schedule/conflicts?${params}`);
  return response.data;
};

export const getForwardSchedule = async (startDate, endDate) => {
  const params = new URLSearchParams();
  if (startDate) params.append('startDate', new Date(startDate).toISOString());
  if (endDate) params.append('endDate', new Date(endDate).toISOString());
  const response = await api.get(`/changes/schedule/forward?${params}`);
  return response.data;
};

export const getHighConcentrationDays = async (startDate, endDate) => {
  const params = new URLSearchParams();
  if (startDate) params.append('startDate', new Date(startDate).toISOString());
  if (endDate) params.append('endDate', new Date(endDate).toISOString());
  const response = await api.get(`/changes/schedule/high-concentration?${params}`);
  return response.data;
};

// ==========================================
// METRICS: Dashboard & Reports
// ==========================================

export const getMetrics = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.startDate) params.append('startDate', filters.startDate);
  if (filters.endDate) params.append('endDate', filters.endDate);
  const response = await api.get(`/changes/metrics?${params}`);
  return response.data;
};

export const getPIRReport = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.startDate) params.append('startDate', filters.startDate);
  if (filters.endDate) params.append('endDate', filters.endDate);
  const response = await api.get(`/changes/metrics/pir?${params}`);
  return response.data;
};

export const getTrends = async () => {
  const response = await api.get('/changes/metrics/trends');
  return response.data;
};