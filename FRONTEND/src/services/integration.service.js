
import api from './api';

class IntegrationService {
    // Lista todas as integrações configuradas ou disponíveis
    async getAll() {
        const response = await api.get('/integrations');
        return response.data;
    }

    // Atualiza uma integração (salva config)
    async update(type, data) {
        const response = await api.put(`/integrations/${type}`, data);
        return response.data;
    }

    // Testa conexão
    async testConnection(type) {
        const response = await api.post(`/integrations/${type}/test`);
        return response.data;
    }
}

const integrationService = new IntegrationService();
export default integrationService;
