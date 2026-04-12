import api from './api';

export const getAssets = async (filters = {}) => {
  const params = new URLSearchParams(filters);
  const response = await api.get(`/assets?${params}`);
  return response.data;
};

export const getAssetById = async (id) => {
  const response = await api.get(`/assets/${id}`);
  return response.data;
};

export const createAsset = async (data) => {
  const response = await api.post('/assets', data);
  return response.data;
};

export const updateAsset = async (id, data) => {
  const response = await api.put(`/assets/${id}`, data);
  return response.data;
};

export const deleteAsset = async (id) => {
  const response = await api.delete(`/assets/${id}`);
  return response.data;
};