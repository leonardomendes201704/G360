import api from './api';

const GlobalSettingService = {
    /**
     * Lista todas as configurações agrupadas por categoria.
     */
    getAll: async () => {
        const response = await api.get('/global-settings');
        return response.data;
    },

    /**
     * Lista configurações de uma categoria.
     */
    getByCategory: async (category) => {
        const response = await api.get(`/global-settings/${category}`);
        return response.data;
    },

    /**
     * Atualiza múltiplas configurações.
     * @param {Array<{category, key, value}>} settings
     */
    update: async (settings) => {
        const response = await api.put('/global-settings', { settings });
        return response.data;
    },

    /**
     * Testa a configuração SMTP.
     * @param {string} [email] - Email do destinatário (opcional)
     */
    testSmtp: async (email) => {
        const response = await api.post('/global-settings/test-smtp', { email });
        return response.data;
    },

    /**
     * Retorna o health check do sistema.
     */
    getSystemHealth: async () => {
        const response = await api.get('/global-settings/system-health');
        return response.data;
    },
};

export default GlobalSettingService;
