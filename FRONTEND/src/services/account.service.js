import api from './api';

class AccountService {
  async getAll() {
    const response = await api.get('/accounts');
    return response.data;
  }

  async getById(id) {
    const response = await api.get(`/accounts/${id}`);
    return response.data;
  }

  async create(data) {
    const response = await api.post('/accounts', data);
    return response.data;
  }

  async update(id, data) {
    const response = await api.put(`/accounts/${id}`, data);
    return response.data;
  }

  async delete(id) {
    await api.delete(`/accounts/${id}`);
  }
}

const accountService = new AccountService();
export default accountService;

// --- EXPORTAÇÕES DE COMPATIBILIDADE (LEGADO) ---
export const getAccounts = () => accountService.getAll();
export const getAccountById = (id) => accountService.getById(id);
export const createAccount = (data) => accountService.create(data);
export const updateAccount = (id, data) => accountService.update(id, data);
export const deleteAccount = (id) => accountService.delete(id);