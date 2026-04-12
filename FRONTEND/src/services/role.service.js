import api from './api';

class RoleService {
    async getAll() {
        const response = await api.get('/roles');
        return response.data;
    }

    async getById(id) {
        const response = await api.get(`/roles/${id}`);
        return response.data;
    }

    async create(data) {
        const response = await api.post('/roles', data);
        return response.data;
    }

    async update(id, data) {
        const response = await api.put(`/roles/${id}`, data);
        return response.data;
    }

    async delete(id) {
        await api.delete(`/roles/${id}`);
    }
}

const roleService = new RoleService();
export default roleService;
