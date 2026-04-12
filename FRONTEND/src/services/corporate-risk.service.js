import api from './api';

export const getRisks = async (filters) => {
    const params = new URLSearchParams(filters).toString();
    const response = await api.get(`/corporate-risks?${params}`);
    return response.data;
};

export const getRiskById = async (id) => {
    const response = await api.get(`/corporate-risks/${id}`);
    return response.data;
};

export const createRisk = async (data) => {
    const response = await api.post('/corporate-risks', data);
    return response.data;
};

export const updateRisk = async (id, data) => {
    const response = await api.put(`/corporate-risks/${id}`, data);
    return response.data;
};

export const deleteRisk = async (id) => {
    const response = await api.delete(`/corporate-risks/${id}`);
    return response.data;
};

export const getHeatmapMetrics = async () => {
    const response = await api.get('/corporate-risks/metrics/heatmap');
    return response.data;
};
