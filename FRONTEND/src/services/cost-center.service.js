import api from './api';

class CostCenterService {
  async getAll() {
    const response = await api.get('/cost-centers');
    return response.data;
  }

  async getById(id) {
    const response = await api.get(`/cost-centers/${id}`);
    return response.data;
  }

  async create(data) {
    const response = await api.post('/cost-centers', data);
    return response.data;
  }

  async update(id, data) {
    const response = await api.put(`/cost-centers/${id}`, data);
    return response.data;
  }

  async delete(id) {
    await api.delete(`/cost-centers/${id}`);
    return true; // Retorno para confirmar sucesso
  }
}

const costCenterService = new CostCenterService();
export default costCenterService;

// --- EXPORTAÇÕES DE COMPATIBILIDADE (LEGADO) ---
export const getCostCenters = () => costCenterService.getAll();
export const getCostCenterById = (id) => costCenterService.getById(id);
export const createCostCenter = (data) => costCenterService.create(data);
export const updateCostCenter = (id, data) => costCenterService.update(id, data);
export const deleteCostCenter = (id) => costCenterService.delete(id);