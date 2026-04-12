import api from './api';

export const getMaintenances = async (assetId) => {
  const response = await api.get(`/assets/${assetId}/maintenances`);
  return response.data;
};

export const createMaintenance = async (assetId, data) => {
  const response = await api.post(`/assets/${assetId}/maintenances`, data);
  return response.data;
};

export const updateMaintenance = async (maintenanceId, data) => {
  const response = await api.put(`/assets/maintenances/${maintenanceId}`, data);
  return response.data;
};

export const deleteMaintenance = async (maintenanceId) => {
  const response = await api.delete(`/assets/maintenances/${maintenanceId}`);
  return response.data;
};