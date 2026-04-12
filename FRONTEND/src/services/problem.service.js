import api from './api';

class ProblemService {
  async getAll(params = {}) {
    const response = await api.get('/problems', { params });
    return response.data;
  }

  async getById(id) {
    const response = await api.get(`/problems/${id}`);
    return response.data;
  }

  async create(data) {
    const response = await api.post('/problems', data);
    return response.data;
  }

  async updateStatus(id, data) {
    const response = await api.patch(`/problems/${id}/status`, data);
    return response.data;
  }

  async linkIncident(id, ticketId) {
    const response = await api.post(`/problems/${id}/link`, { ticketId });
    return response.data;
  }
}

export default new ProblemService();
