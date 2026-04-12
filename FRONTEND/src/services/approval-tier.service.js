import api from './api';

class ApprovalTierService {
  async getAll() {
    const response = await api.get('/approval-tiers');
    return response.data;
  }

  async create(data) {
    const response = await api.post('/approval-tiers', data);
    return response.data;
  }

  async update(id, data) {
    const response = await api.put(`/approval-tiers/${id}`, data);
    return response.data;
  }

  async delete(id) {
    await api.delete(`/approval-tiers/${id}`);
  }
}

const approvalTierService = new ApprovalTierService();
export default approvalTierService;
