import api from './api';

const basePath = '/tickets';

const ticketService = {
  getAll: async (params) => {
    const response = await api.get(basePath, { params });
    return response.data;
  },
  getById: async (id) => {
    const response = await api.get(`${basePath}/${id}`);
    return response.data;
  },
  create: async (data) => {
    const response = await api.post(basePath, data);
    return response.data;
  },
  addMessage: async (id, data) => {
    const response = await api.post(`${basePath}/${id}/messages`, data);
    return response.data;
  },
  updateStatus: async (id, payload) => {
    const response = await api.patch(`${basePath}/${id}/status`, payload);
    return response.data;
  },
  patch: async (id, data) => {
    const response = await api.patch(`${basePath}/${id}`, data);
    return response.data;
  },
  submitSatisfaction: async (id, data) => {
    const response = await api.post(`${basePath}/${id}/satisfaction`, data);
    return response.data;
  },
  getMetricsOverview: async (params) => {
    const response = await api.get(`${basePath}/metrics/overview`, { params });
    return response.data;
  },
  downloadExport: async (params) => {
    const response = await api.get(`${basePath}/export`, {
      params,
      responseType: 'blob'
    });
    const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chamados-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  },
  escalateToProblem: async (id) => {
    const response = await api.post(`${basePath}/${id}/escalate/problem`);
    return response.data;
  },
  escalateToChange: async (id) => {
    const response = await api.post(`${basePath}/${id}/escalate/change`);
    return response.data;
  },
  escalateToProject: async (id, projectName) => {
    const response = await api.post(`${basePath}/${id}/escalate/project`, { projectName });
    return response.data;
  }
};

export default ticketService;
