import api from './api';

class KnowledgeBaseService {
    static async getDashboardStats() {
        const response = await api.get('/knowledge-base/dashboard');
        return response.data;
    }

    static async findAll(params) {
        // params: { search, category, tag }
        const response = await api.get('/knowledge-base', { params });
        return response.data;
    }

    static async findById(id) {
        const response = await api.get(`/knowledge-base/${id}`);
        return response.data;
    }

    static async create(formData) {
        // formData must be FormData object if file is included
        const response = await api.post('/knowledge-base', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    }

    static async update(id, data) {
        const response = await api.put(`/knowledge-base/${id}`, data);
        return response.data;
    }

    static async delete(id) {
        await api.delete(`/knowledge-base/${id}`);
    }
}

export default KnowledgeBaseService;
