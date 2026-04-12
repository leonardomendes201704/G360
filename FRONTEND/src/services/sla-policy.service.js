import api from './api';

const SlaPolicyService = {
  getAll: async () => {
    const response = await api.get('/sla-policies');
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/sla-policies', data);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/sla-policies/${id}`);
    return response.data;
  }
};

export default SlaPolicyService;
