import api from './api';

// ==========================================
// GESTÃO DE RISCOS
// ==========================================

export const getRisks = async (projectId) => {
  const response = await api.get(`/projects/${projectId}/risks`);
  return response.data;
};

export const createRisk = async (projectId, data) => {
  const response = await api.post(`/projects/${projectId}/risks`, data);
  return response.data;
};

export const updateRisk = async (projectId, riskId, data) => {
  const response = await api.put(`/projects/${projectId}/risks/${riskId}`, data);
  return response.data;
};

export const deleteRisk = async (projectId, riskId) => {
  const response = await api.delete(`/projects/${projectId}/risks/${riskId}`);
  return response.data;
};

// ==========================================
// ATAS DE REUNIÃO (MINUTES)
// ==========================================

export const getMinutes = async (projectId) => {
  const response = await api.get(`/projects/${projectId}/minutes`);
  return response.data;
};

export const uploadMinute = async (projectId, data) => {
  const formData = new FormData();
  formData.append('title', data.title);
  formData.append('date', data.date);
  formData.append('location', data.location || '');
  formData.append('duration', data.duration || '');
  formData.append('participants', data.participants || '');
  formData.append('topics', JSON.stringify(data.topics || []));
  formData.append('actions', JSON.stringify(data.actions || []));

  if (data.file) {
    formData.append('file', data.file);
  }

  const params = new URLSearchParams();
  if (data.projectName) params.append('projectName', data.projectName);
  params.append('category', 'minutes');

  const response = await api.post(
    `/projects/${projectId}/minutes?${params.toString()}`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  return response.data;
};

export const updateMinute = async (projectId, minuteId, data) => {
  const formData = new FormData();
  formData.append('title', data.title);
  formData.append('date', data.date);
  formData.append('location', data.location || '');
  formData.append('duration', data.duration || '');
  formData.append('participants', data.participants || '');
  formData.append('topics', JSON.stringify(data.topics || []));
  formData.append('actions', JSON.stringify(data.actions || []));

  if (data.file) {
    formData.append('file', data.file);
  }

  const params = new URLSearchParams();
  if (data.projectName) params.append('projectName', data.projectName);
  params.append('category', 'minutes');

  const response = await api.put(
    `/projects/${projectId}/minutes/${minuteId}?${params.toString()}`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  return response.data;
};

export const deleteMinute = async (projectId, minuteId) => {
  const response = await api.delete(`/projects/${projectId}/minutes/${minuteId}`);
  return response.data;
};

// Aprovação de Atas
export const submitMinute = async (projectId, minuteId) => {
  const response = await api.post(`/projects/${projectId}/minutes/${minuteId}/submit`);
  return response.data;
};

export const approveMinute = async (projectId, minuteId) => {
  const response = await api.post(`/projects/${projectId}/minutes/${minuteId}/approve`);
  return response.data;
};

export const rejectMinute = async (projectId, minuteId, reason) => {
  const response = await api.post(`/projects/${projectId}/minutes/${minuteId}/reject`, { reason });
  return response.data;
};


// ==========================================
// PROPOSTAS DE FORNECEDORES (BIDS)
// ==========================================

export const getProposals = async (projectId) => {
  const response = await api.get(`/projects/${projectId}/proposals`);
  return response.data;
};

export const createProposal = async (projectId, data) => {
  const formData = new FormData();
  formData.append('supplierId', data.supplierId);
  formData.append('value', data.value);
  formData.append('isWinner', data.isWinner);

  if (data.file) {
    formData.append('file', data.file);
  }

  const params = new URLSearchParams();
  if (data.projectName) params.append('projectName', data.projectName);
  params.append('category', 'proposals');

  const response = await api.post(
    `/projects/${projectId}/proposals?${params.toString()}`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  return response.data;
};

export const updateProposal = async (projectId, proposalId, data) => {
  const response = await api.put(`/projects/${projectId}/proposals/${proposalId}`, data);
  return response.data;
};

export const deleteProposal = async (projectId, proposalId, justification = null) => {
  const config = justification ? { data: { justification } } : {};
  const response = await api.delete(`/projects/${projectId}/proposals/${proposalId}`, config);
  return response.data;
};

// Submeter proposta para aprovação do gestor
export const submitProposal = async (projectId, proposalId) => {
  const response = await api.post(`/projects/${projectId}/proposals/${proposalId}/submit`);
  return response.data;
};

// ==========================================
// CUSTOS DO PROJETO (Entidade Própria)
// ==========================================

export const getProjectCosts = async (projectId) => {
  const response = await api.get(`/projects/${projectId}/costs`);
  return response.data;
};

export const createProjectCost = async (projectId, data) => {
  const formData = new FormData();
  formData.append('description', data.description);
  formData.append('type', data.type);
  formData.append('amount', data.amount);
  formData.append('date', data.date);
  if (data.status) formData.append('status', data.status);
  if (data.supplierId) formData.append('supplierId', data.supplierId);
  if (data.invoiceNumber) formData.append('invoiceNumber', data.invoiceNumber);
  if (data.dueDate) formData.append('dueDate', data.dueDate);
  if (data.paymentDate) formData.append('paymentDate', data.paymentDate);
  if (data.notes) formData.append('notes', data.notes);
  if (data.file) formData.append('file', data.file);

  const response = await api.post(`/projects/${projectId}/costs`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};

export const updateProjectCost = async (projectId, costId, data) => {
  const response = await api.put(`/projects/${projectId}/costs/${costId}`, data);
  return response.data;
};

export const deleteProjectCost = async (projectId, costId) => {
  const response = await api.delete(`/projects/${projectId}/costs/${costId}`);
  return response.data;
};

// ==========================================
// FOLLOW-UP SEMANAL (NOVO)
// ==========================================

export const getFollowUps = async (projectId) => {
  const response = await api.get(`/projects/${projectId}/followups`);
  return response.data;
};

export const createFollowUp = async (projectId, data) => {
  const response = await api.post(`/projects/${projectId}/followups`, data);
  return response.data;
};

export const updateFollowUp = async (projectId, followUpId, data) => {
  const response = await api.put(`/projects/${projectId}/followups/${followUpId}`, data);
  return response.data;
};

export const deleteFollowUp = async (projectId, followUpId) => {
  const response = await api.delete(`/projects/${projectId}/followups/${followUpId}`);
  return response.data;
};

export const completeFollowUp = async (projectId, followUpId) => {
  const response = await api.post(`/projects/${projectId}/followups/${followUpId}/complete`);
  return response.data;
};

export const rescheduleFollowUp = async (projectId, followUpId, newDate) => {
  const response = await api.post(`/projects/${projectId}/followups/${followUpId}/reschedule`, { newDate });
  return response.data;
};

export const getActivities = async (projectId) => {
  const response = await api.get(`/projects/${projectId}/activities`);
  return response.data;
};

// ==========================================
// TAREFAS DO PROJETO
// ==========================================

export const getProjectTasks = async (projectId) => {
  const response = await api.get(`/project-tasks/project/${projectId}`);
  return response.data;
};

export const createProjectTask = async (projectId, data) => {
  const response = await api.post(`/project-tasks`, { ...data, projectId });
  return response.data;
};

export const updateProjectTask = async (taskId, data) => {
  const response = await api.put(`/project-tasks/${taskId}`, data);
  return response.data;
};

export const deleteProjectTask = async (taskId) => {
  const response = await api.delete(`/project-tasks/${taskId}`);
  return response.data;
};