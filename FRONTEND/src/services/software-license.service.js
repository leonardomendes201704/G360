import api from './api';

export const getLicenses = async () => {
  const response = await api.get('/software-licenses');
  return response.data;
};

export const createLicense = async (data) => {
  const response = await api.post('/software-licenses', data);
  return response.data;
};

export const updateLicense = async (id, data) => {
  const response = await api.put(`/software-licenses/${id}`, data);
  return response.data;
};

export const deleteLicense = async (id) => {
  const response = await api.delete(`/software-licenses/${id}`);
  return response.data;
};