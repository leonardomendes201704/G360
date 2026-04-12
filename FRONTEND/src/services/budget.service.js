import api from './api';

class BudgetService {
  async getAll() {
    const response = await api.get('/budgets');
    return response.data;
  }

  async getById(id) {
    const response = await api.get(`/budgets/${id}`);
    return response.data;
  }

  async create(data) {
    const response = await api.post('/budgets', data);
    return response.data;
  }

  async update(id, data) {
    const response = await api.put(`/budgets/${id}`, data);
    return response.data;
  }

  async delete(id) {
    const response = await api.delete(`/budgets/${id}`);
    return response.data;
  }

  async duplicate(id, newName) {
    const response = await api.post(`/budgets/${id}/duplicate`, { newName });
    return response.data;
  }

  // --- ITENS DO ORÇAMENTO ---
  async addItem(budgetId, data) {
    const response = await api.post(`/budgets/${budgetId}/items`, data);
    return response.data;
  }

  async updateItem(itemId, data) {
    const response = await api.put(`/budgets/items/${itemId}`, data);
    return response.data;
  }

  async deleteItem(itemId) {
    const response = await api.delete(`/budgets/items/${itemId}`);
    return response.data;
  }

  async submitForApproval(id) {
    const response = await api.patch(`/budgets/${id}/submit-approval`);
    return response.data;
  }

  async approve(id) {
    const response = await api.patch(`/budgets/${id}/approve`);
    return response.data;
  }
}

// 1. Exportação Padrão (Classe) - O que o FinancePage.jsx está procurando
const budgetService = new BudgetService();
export default budgetService;

// 2. Exportações de Compatibilidade (Funções Soltas) - Para não quebrar o legado
export const getBudgets = () => budgetService.getAll();
export const getBudgetById = (id) => budgetService.getById(id);
export const createBudget = (data) => budgetService.create(data);
export const addBudgetItem = (budgetId, data) => budgetService.addItem(budgetId, data);
export const updateBudgetItem = (itemId, data) => budgetService.updateItem(itemId, data);
export const deleteBudgetItem = (itemId) => budgetService.deleteItem(itemId);
export const submitBudgetForApproval = (id) => budgetService.submitForApproval(id);
export const approveBudget = (id) => budgetService.approve(id);
export const duplicateBudget = (id, newName) => budgetService.duplicate(id, newName);