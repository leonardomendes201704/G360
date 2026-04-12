import api from './api';

class ApprovalService {
    // Contagens para badge
    async getCounts() {
        const response = await api.get('/approvals/counts');
        return response.data;
    }

    // Lista de pendências
    async getPending(type = null) {
        const params = type ? `?type=${type}` : '';
        const response = await api.get(`/approvals/pending${params}`);
        return response.data;
    }

    // Obter detalhes
    async getDetail(type, id) {
        const response = await api.get(`/approvals/${type}/${id}/detail`);
        return response.data;
    }

    // Histórico
    async getHistory(limit = 50) {
        const response = await api.get(`/approvals/history?limit=${limit}`);
        return response.data;
    }

    // Aprovar
    async approve(type, id) {
        const response = await api.post(`/approvals/${type}/${id}/approve`);
        return response.data;
    }

    // Rejeitar
    async reject(type, id, reason, requiresAdjustment = false) {
        const response = await api.post(`/approvals/${type}/${id}/reject`, { reason, requiresAdjustment });
        return response.data;
    }
}

const approvalService = new ApprovalService();
export default approvalService;
