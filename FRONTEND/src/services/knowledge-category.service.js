import api from './api';

const KnowledgeCategoryService = {
    /**
     * List all categories
     */
    getAll: async (includeInactive = false) => {
        const response = await api.get('/knowledge-categories', {
            params: { includeInactive }
        });
        return response.data;
    },

    /**
     * Get category by ID
     */
    getById: async (id) => {
        const response = await api.get(`/knowledge-categories/${id}`);
        return response.data;
    },

    /**
     * Create a new category
     */
    create: async (data) => {
        const response = await api.post('/knowledge-categories', data);
        return response.data;
    },

    /**
     * Update a category
     */
    update: async (id, data) => {
        const response = await api.put(`/knowledge-categories/${id}`, data);
        return response.data;
    },

    /**
     * Delete a category
     */
    delete: async (id) => {
        const response = await api.delete(`/knowledge-categories/${id}`);
        return response.data;
    },

    /**
     * Seed default categories
     */
    seedDefaults: async () => {
        const response = await api.post('/knowledge-categories/seed');
        return response.data;
    }
};

export default KnowledgeCategoryService;
