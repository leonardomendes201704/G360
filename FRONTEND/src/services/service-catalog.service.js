import api from './api';

const basePath = '/service-catalog';

const serviceCatalogService = {
  getAll: async (params = {}) => {
    const response = await api.get(basePath, { params: { ...params, _t: Date.now() } });
    return response.data;
  },
  getCategories: async () => {
    const response = await api.get(`${basePath}/categories`, { params: { _t: Date.now() } });
    return response.data;
  },
  createCategory: async (data) => {
    const response = await api.post(`${basePath}/categories`, data);
    return response.data;
  },
  updateCategory: async (id, data) => {
    const response = await api.put(`${basePath}/categories/${id}`, data);
    return response.data;
  },
  deleteCategory: async (id) => {
    const response = await api.delete(`${basePath}/categories/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post(basePath, data);
    return response.data;
  },
  update: async (id, data) => {
    const response = await api.put(`${basePath}/${id}`, data);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`${basePath}/${id}`);
    return response.data;
  }
};

export default serviceCatalogService;
