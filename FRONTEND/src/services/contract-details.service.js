import api from './api';

// --- Anexos ---
export const getAttachments = async (contractId) => {
  const response = await api.get(`/contracts/${contractId}/attachments`);
  return response.data;
};

export const uploadAttachment = async (contractId, file, type) => {
  const formData = new FormData();
  formData.append('file', file);
  // Passa o tipo via query string
  const response = await api.post(`/contracts/${contractId}/attachments?type=${type}`, formData);
  return response.data;
};

export const deleteAttachment = async (attachmentId) => {
  const response = await api.delete(`/contracts/attachments/${attachmentId}`);
  return response.data;
};

// --- Aditivos ---
export const getAddendums = async (contractId) => {
  const response = await api.get(`/contracts/${contractId}/addendums`);
  return response.data;
};

export const createAddendum = async (contractId, data) => {
  const formData = new FormData();
  formData.append('number', data.number);
  formData.append('description', data.description);
  formData.append('signatureDate', data.signatureDate);
  if (data.valueChange) formData.append('valueChange', data.valueChange);
  if (data.newEndDate) formData.append('newEndDate', data.newEndDate);
  if (data.file) formData.append('file', data.file);

  const response = await api.post(`/contracts/${contractId}/addendums`, formData);
  return response.data;
};

export const updateAddendum = async (contractId, addendumId, data) => {
  const formData = new FormData();
  formData.append('number', data.number);
  formData.append('description', data.description);
  formData.append('signatureDate', data.signatureDate);
  if (data.valueChange) formData.append('valueChange', data.valueChange);
  if (data.newEndDate) formData.append('newEndDate', data.newEndDate);
  if (data.file) formData.append('file', data.file);

  // A rota no backend é: /contracts/addendums/:addendumId
  const response = await api.put(`/contracts/addendums/${addendumId}`, formData);
  return response.data;
};

export const deleteAddendum = async (contractId, addendumId) => {
  const response = await api.delete(`/contracts/addendums/${addendumId}`);
  return response.data;
};