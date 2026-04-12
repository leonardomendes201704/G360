import api from './api';

export const getAssetCategories = async () => {
  const response = await api.get('/asset-categories');
  return response.data;
};

export const createAssetCategory = async (data) => {
  const response = await api.post('/asset-categories', data);
  return response.data;
};

export const updateAssetCategory = async (id, data) => {
  const response = await api.put(`/asset-categories/${id}`, data);
  return response.data;
};

export const deleteAssetCategory = async (id) => {
  const response = await api.delete(`/asset-categories/${id}`);
  return response.data;
};