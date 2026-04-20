import api from './api';

// ==========================================
// TAREFAS DE PROJETO (VINCULADAS)
// ==========================================

export const getTasksByProject = async (projectId, filters = {}) => {
  const params = new URLSearchParams(filters);
  const response = await api.get(`/project-tasks/project/${projectId}?${params}`);
  return response.data;
};

export const createTask = async (data) => {
  const response = await api.post('/project-tasks', data);
  return response.data;
};

export const updateTask = async (id, data) => {
  const response = await api.put(`/project-tasks/${id}`, data);
  return response.data;
};

export const deleteTask = async (id) => {
  const response = await api.delete(`/project-tasks/${id}`);
  return response.data;
};

// --- COMENTÁRIOS E ANEXOS DE PROJETO ---
// (Mantemos como está, pois o backend de tarefas gerais ainda não tem comments/attachments)
export const getTaskComments = async (taskId) => {
  const response = await api.get(`/project-tasks/${taskId}/comments`);
  return response.data;
};

export const addTaskComment = async (taskId, content) => {
  const response = await api.post(`/project-tasks/${taskId}/comments`, { content });
  return response.data;
};

export const deleteTaskComment = async (commentId) => {
  const response = await api.delete(`/project-tasks/comments/${commentId}`);
  return response.data;
};

export const getTaskAttachments = async (taskId) => {
  const response = await api.get(`/project-tasks/${taskId}/attachments`);
  return response.data;
};

export const addTaskAttachment = async (taskId, file, projectName) => {
  const formData = new FormData();
  formData.append('file', file);
  const params = new URLSearchParams();
  if (projectName) params.append('projectName', projectName);

  const response = await api.post(`/project-tasks/${taskId}/attachments?${params.toString()}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};

export const deleteTaskAttachment = async (attachmentId) => {
  const response = await api.delete(`/project-tasks/attachments/${attachmentId}`);
  return response.data;
};

// ==========================================
// TAREFAS GERAIS (AVULSAS) - NOVO
// ==========================================

export const getGeneralTasks = async (filters = {}) => {
  // filters pode conter: { view, search, priority }
  const params = new URLSearchParams();
  
  if (filters.view) params.append('view', filters.view);
  if (filters.search) params.append('search', filters.search);
  if (filters.priority && filters.priority !== 'ALL') params.append('priority', filters.priority);

  const response = await api.get(`/tasks?${params.toString()}`);
  return response.data;
};

export const createGeneralTask = async (data) => {
  const response = await api.post('/tasks', data);
  return response.data;
};

/** Kanban / drag: mesmo truque que project-tasks — `?update=status-only` evita 422 Yup no PUT só com status. */
export const updateGeneralTask = async (id, data) => {
  const keys = data && typeof data === 'object' ? Object.keys(data).filter((k) => data[k] !== undefined) : [];
  const statusOnly = keys.length === 1 && keys[0] === 'status';
  const url = statusOnly ? `/tasks/${id}?update=status-only` : `/tasks/${id}`;
  const response = await api.put(url, data);
  return response.data;
};

export const deleteGeneralTask = async (id) => {
  const response = await api.delete(`/tasks/${id}`);
  return response.data;
};

// ==========================================
// TAREFAS GERAIS - COMENTÁRIOS & ANEXOS
// ==========================================

export const getGeneralTaskComments = async (taskId) => {
  const response = await api.get(`/tasks/${taskId}/comments`);
  return response.data;
};

export const addGeneralTaskComment = async (taskId, content) => {
  const response = await api.post(`/tasks/${taskId}/comments`, { content });
  return response.data;
};

export const deleteGeneralTaskComment = async (commentId) => {
  const response = await api.delete(`/tasks/comments/${commentId}`);
  return response.data;
};

export const getGeneralTaskAttachments = async (taskId) => {
  const response = await api.get(`/tasks/${taskId}/attachments`);
  return response.data;
};

export const addGeneralTaskAttachment = async (taskId, file) => {
  const formData = new FormData();
  formData.append('file', file);
  // Nota: Tarefas gerais não precisam de projectName, o backend salva em 'tasks'
  const response = await api.post(`/tasks/${taskId}/attachments`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};

export const deleteGeneralTaskAttachment = async (attachmentId) => {
  const response = await api.delete(`/tasks/attachments/${attachmentId}`);
  return response.data;
};