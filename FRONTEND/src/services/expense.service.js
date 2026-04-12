import api from './api';

export const getExpenses = async (filters = {}) => {
  const params = new URLSearchParams(filters);
  const response = await api.get(`/expenses?${params}`);
  return response.data;
};

export const createExpense = async (data) => {
  const formData = new FormData();
  Object.keys(data).forEach(key => {
    if (data[key] !== null && data[key] !== undefined) {
      formData.append(key, data[key]);
    }
  });

  const response = await api.post('/expenses', formData);
  return response.data;
};

export const updateExpense = async (id, data) => {
  const formData = new FormData();

  Object.keys(data).forEach(key => {
    const value = data[key];
    // Skip null, undefined, and the id field
    if (value === null || value === undefined || key === 'id') return;

    // Handle File objects specially
    if (value instanceof File) {
      formData.append(key, value, value.name);
    } else if (value instanceof Date) {
      formData.append(key, value.toISOString());
    } else {
      formData.append(key, value);
    }
  });

  const response = await api.put(`/expenses/${id}`, formData);
  return response.data;
};

export const deleteExpense = async (id) => {
  const response = await api.delete(`/expenses/${id}`);
  return response.data;
};

// Workflow de Aprovação
export const submitForApproval = async (id) => {
  const response = await api.post(`/expenses/${id}/submit-approval`);
  return response.data;
};