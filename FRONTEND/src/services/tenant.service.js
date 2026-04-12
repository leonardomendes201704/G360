import api from './api';

const TenantService = {
    getAll: async () => {
        const response = await api.get('/tenants');
        return response.data;
    },

    create: async (data) => {
        const response = await api.post('/tenants', data);
        return response.data;
    },

    // Placeholder for update
    update: async (id, data) => {
        const response = await api.put(`/tenants/${id}`, data);
        return response.data;
    },

    delete: async (id) => {
        await api.delete(`/tenants/${id}`);
    }
};

export default TenantService;
