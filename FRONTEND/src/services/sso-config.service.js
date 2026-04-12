import api from './api';

class SSOConfigService {
  async get() {
    const response = await api.get('/sso-config');
    return response.data;
  }

  async update(data) {
    const response = await api.put('/sso-config', data);
    return response.data;
  }

  async delete() {
    await api.delete('/sso-config');
  }

  async testConnection() {
    const response = await api.post('/sso-config/test-connection');
    return response.data;
  }
}

export default new SSOConfigService();