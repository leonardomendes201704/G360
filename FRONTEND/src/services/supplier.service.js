import api from './api';

class SupplierService {
  async getAll() {
    const response = await api.get('/suppliers');
    return response.data;
  }

  async getById(id) {
    const response = await api.get(`/suppliers/${id}`);
    return response.data;
  }

  async create(data) {
    const response = await api.post('/suppliers', data);
    return response.data;
  }

  async update(id, data) {
    const response = await api.put(`/suppliers/${id}`, data);
    return response.data;
  }

  async delete(id) {
    await api.delete(`/suppliers/${id}`);
  }
}

const supplierService = new SupplierService();
export default supplierService;

// --- EXPORTAÇÕES DE COMPATIBILIDADE (LEGADO) ---
export const getSuppliers = () => supplierService.getAll();
export const getSupplierById = (id) => supplierService.getById(id);
export const createSupplier = (data) => supplierService.create(data);
export const updateSupplier = (id, data) => supplierService.update(id, data);
export const deleteSupplier = (id) => supplierService.delete(id);