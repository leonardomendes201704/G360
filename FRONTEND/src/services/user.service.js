import api from './api';

class UserService {
  async getAll() {
    const response = await api.get('/users');
    return response.data;
  }

  async getById(id) {
    const response = await api.get(`/users/${id}`);
    return response.data;
  }

  async create(data) {
    const response = await api.post('/users', data);
    return response.data;
  }

  async update(id, data) {
    const response = await api.put(`/users/${id}`, data);
    return response.data;
  }

  async delete(id) {
    await api.delete(`/users/${id}`);
  }

  async toggleStatus(id) {
    const response = await api.patch(`/users/${id}/toggle-status`);
    return response.data;
  }

  async importAzureUsers(users) {
    const response = await api.post('/users/import-azure', { users });
    return response.data;
  }
}

const userService = new UserService();
export default userService;

// --- EXPORTAÇÕES DE COMPATIBILIDADE (LEGADO) ---
export const getUsers = () => userService.getAll();
export const getUserById = (id) => userService.getById(id);
export const createUser = (data) => userService.create(data);
export const updateUser = (id, data) => userService.update(id, data);
export const deleteUser = (id) => userService.delete(id);