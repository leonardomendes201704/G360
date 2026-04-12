import api from './api';

const FreezeWindowService = {
    getAll: async (activeOnly = false) => {
        const response = await api.get(`/freeze-windows?activeOnly=${activeOnly}`);
        return response.data;
    },

    create: async (data) => {
        const response = await api.post('/freeze-windows', data);
        return response.data;
    },

    update: async (id, data) => {
        const response = await api.put(`/freeze-windows/${id}`, data);
        return response.data;
    },

    delete: async (id) => {
        await api.delete(`/freeze-windows/${id}`);
    }
};

export default FreezeWindowService;
