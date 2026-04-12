import api from './api';

/**
 * Change Template Service
 * Gerencia templates de mudança padrão
 */

export const getTemplates = async () => {
    const response = await api.get('/change-templates');
    return response.data;
};

export const getTemplateById = async (id) => {
    const response = await api.get(`/change-templates/${id}`);
    return response.data;
};

export const createTemplate = async (data) => {
    const response = await api.post('/change-templates', data);
    return response.data;
};

export const updateTemplate = async (id, data) => {
    const response = await api.put(`/change-templates/${id}`, data);
    return response.data;
};

export const deleteTemplate = async (id) => {
    const response = await api.delete(`/change-templates/${id}`);
    return response.data;
};

/**
 * Aplica template e retorna dados pré-preenchidos para criar GMUD
 */
export const applyTemplate = async (id) => {
    const response = await api.post(`/change-templates/${id}/apply`);
    return response.data;
};

export default {
    getTemplates,
    getTemplateById,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    applyTemplate
};
