import api from './api';

export const getContracts = async (filters = {}) => {
  const params = new URLSearchParams(filters);
  const response = await api.get(`/contracts?${params}`);
  return response.data;
};

export const getContractById = async (id) => {
  const response = await api.get(`/contracts/${id}`);
  return response.data;
};

export const createContract = async (data) => {
  const response = await api.post('/contracts', data);
  return response.data;
};

export const updateContract = async (id, data) => {
  const response = await api.put(`/contracts/${id}`, data);
  return response.data;
};

export const deleteContract = async (id) => {
  const response = await api.delete(`/contracts/${id}`);
  return response.data;
};