import api from './api';

export const getDashboardActivity = async ({ limit = 30, module: mod, userId } = {}) => {
    const params = new URLSearchParams();
    if (limit) params.set('limit', limit);
    if (mod) params.set('module', mod);
    if (userId) params.set('userId', userId);
    const response = await api.get(`/dashboard/activity?${params.toString()}`);
    return response.data;
};

export const getManagerStats = async () => {
    const response = await api.get('/dashboard/manager');
    return response.data;
};

export const getCollaboratorStats = async () => {
    const response = await api.get('/dashboard/collaborator');
    return response.data;
};
