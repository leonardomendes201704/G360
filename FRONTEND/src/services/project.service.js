import api from './api';

class ProjectService {
  async getAll(filters = {}) {
    const params = new URLSearchParams(filters);
    const response = await api.get(`/projects?${params}`);
    return response.data;
  }

  async getById(id) {
    const response = await api.get(`/projects/${id}`);
    return response.data;
  }

  async create(data) {
    const response = await api.post('/projects', data);
    return response.data;
  }

  async update(id, data) {
    const response = await api.put(`/projects/${id}`, data);
    return response.data;
  }

  async delete(id) {
    const response = await api.delete(`/projects/${id}`);
    return response.data;
  }

  // --- Membros ---
  async addMember(projectId, data) {
    const response = await api.post(`/projects/${projectId}/members`, data);
    return response.data;
  }

  async updateMember(projectId, userId, role) {
    const response = await api.put(`/projects/${projectId}/members/${userId}`, { role });
    return response.data;
  }

  async removeMember(projectId, userId) {
    const response = await api.delete(`/projects/${projectId}/members/${userId}`);
    return response.data;
  }

  // --- Propostas ---
  async getProposals(projectId) {
    const response = await api.get(`/projects/${projectId}/proposals`);
    return response.data;
  }

  async setPaymentCondition(projectId, proposalId, data) {
    const response = await api.post(`/projects/${projectId}/proposals/${proposalId}/payment-condition`, data);
    return response.data;
  }

  async generateCostsFromProposal(projectId, proposalId) {
    const response = await api.post(`/projects/${projectId}/proposals/${proposalId}/generate-costs`);
    return response.data;
  }

  // --- Custos ---
  async getCosts(projectId) {
    const response = await api.get(`/projects/${projectId}/costs`);
    return response.data;
  }

  async submitCostForApproval(projectId, costId, data) {
    const formData = new FormData();
    if (data.invoiceNumber) formData.append('invoiceNumber', data.invoiceNumber);
    if (data.invoiceValue) formData.append('invoiceValue', data.invoiceValue);
    if (data.dueDate) formData.append('dueDate', data.dueDate);
    if (data.notes) formData.append('notes', data.notes);
    if (data.file) formData.append('file', data.file);

    const response = await api.post(`/projects/${projectId}/costs/${costId}/submit`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  }

  async approveCost(projectId, costId) {
    const response = await api.post(`/projects/${projectId}/costs/${costId}/approve`);
    return response.data;
  }

  async rejectCost(projectId, costId, reason) {
    const response = await api.post(`/projects/${projectId}/costs/${costId}/reject`, { reason });
    return response.data;
  }
  // --- Workflow de Aprovação ---
  async submitForApproval(projectId) {
    const response = await api.post(`/projects/${projectId}/submit-approval`);
    return response.data;
  }

  async approveProject(projectId, notes) {
    const response = await api.post(`/projects/${projectId}/approve`, { notes });
    return response.data;
  }

  async rejectProject(projectId, reason) {
    const response = await api.post(`/projects/${projectId}/reject`, { reason });
    return response.data;
  }
}

// Exportação Padrão (Novo Padrão)
const projectService = new ProjectService();
export default projectService;

// Exportações Nomeadas (Compatibilidade com código legado)
export const getProjects = (f) => projectService.getAll(f);
export const getAllProjects = (f) => projectService.getAll(f); // Alias para Portfolio
export const getProjectById = (id) => projectService.getById(id);
export const createProject = (d) => projectService.create(d);
export const updateProject = (id, d) => projectService.update(id, d);
export const deleteProject = (id) => projectService.delete(id);
export const addProjectMember = (pid, d) => projectService.addMember(pid, d);
export const updateProjectMember = (pid, uid, r) => projectService.updateMember(pid, uid, r);
export const removeProjectMember = (pid, uid) => projectService.removeMember(pid, uid);

// Exportações do Workflow
export const submitForApproval = (pid) => projectService.submitForApproval(pid);
export const approveProject = (pid, n) => projectService.approveProject(pid, n);
export const rejectProject = (pid, r) => projectService.rejectProject(pid, r);

// Exportações de Custos
export const submitCostForApproval = (pid, cid, d) => projectService.submitCostForApproval(pid, cid, d);