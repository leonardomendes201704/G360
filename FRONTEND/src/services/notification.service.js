import api from './api';

const notificationService = {
    getAll: async () => {
        const response = await api.get('/notifications');
        return response.data;
    },

    markAsRead: async (id) => {
        await api.put(`/notifications/${id}/read`);
    },

    markAllAsRead: async () => {
        await api.put('/notifications/read-all');
    },

    /** PATCH /auth/me/notification-preferences */
    patchPreferences: async (notificationPreferences) => {
        const response = await api.patch('/auth/me/notification-preferences', { notificationPreferences });
        return response.data;
    },

    /**
     * URL para EventSource — JWT curto dedicado (POST /auth/stream-token), não o access token na query.
     */
    getStreamUrl: async () => {
        const base = api.defaults.baseURL;
        if (!localStorage.getItem('g360_token')) return null;
        try {
            const response = await api.post('/auth/stream-token');
            const streamToken = response.data?.streamToken;
            if (!streamToken) return null;
            return `${base}/notifications/stream?token=${encodeURIComponent(streamToken)}`;
        } catch {
            return null;
        }
    }
};

export default notificationService;
