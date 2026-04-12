import api from './api';

class DepartmentService {
  async getAll() {
    const response = await api.get('/departments');
    return response.data;
  }

  async getById(id) {
    const response = await api.get(`/departments/${id}`);
    return response.data;
  }

  async create(data) {
    const response = await api.post('/departments', data);
    return response.data;
  }

  async update(id, data) {
    const response = await api.put(`/departments/${id}`, data);
    return response.data;
  }

  async delete(id) {
    await api.delete(`/departments/${id}`);
  }
}

const departmentService = new DepartmentService();
export default departmentService;

// --- EXPORTAÇÕES DE COMPATIBILIDADE (LEGADO) ---
export const getDepartments = () => departmentService.getAll();
export const getDepartmentById = (id) => departmentService.getById(id);
export const createDepartment = (data) => departmentService.create(data);
export const updateDepartment = (id, data) => departmentService.update(id, data);
export const deleteDepartment = (id) => departmentService.delete(id);