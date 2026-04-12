import api from './api';

// --- INCIDENTS ---
export const getIncidents = async (filters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            params.append(key, value);
        }
    });
    const { data } = await api.get(`/incidents?${params.toString()}`);
    return data;
};

export const getIncidentById = async (id) => {
    const { data } = await api.get(`/incidents/${id}`);
    return data;
};

export const getIncidentKPIs = async () => {
    const { data } = await api.get('/incidents/kpis');
    return data;
};

export const getIncidentCategories = async (allCategories = false) => {
    const { data } = await api.get(`/incidents/categories${allCategories ? '?all=true' : ''}`);
    return data;
};

export const createIncidentCategory = async (categoryData) => {
    const { data } = await api.post('/incidents/categories', categoryData);
    return data;
};

export const updateIncidentCategory = async (id, categoryData) => {
    const { data } = await api.put(`/incidents/categories/${id}`, categoryData);
    return data;
};

export const createIncident = async (incidentData) => {
    const { data } = await api.post('/incidents', incidentData);
    return data;
};

export const updateIncident = async (id, incidentData) => {
    const { data } = await api.put(`/incidents/${id}`, incidentData);
    return data;
};

export const deleteIncident = async (id) => {
    const { data } = await api.delete(`/incidents/${id}`);
    return data;
};

export const assignIncident = async (id, assigneeId) => {
    const { data } = await api.post(`/incidents/${id}/assign`, { assigneeId });
    return data;
};

export const resolveIncident = async (id, solution, rootCause = null) => {
    const { data } = await api.post(`/incidents/${id}/resolve`, { solution, rootCause });
    return data;
};

export const closeIncident = async (id) => {
    const { data } = await api.post(`/incidents/${id}/close`);
    return data;
};

export const escalateIncident = async (id, reason) => {
    const { data } = await api.post(`/incidents/${id}/escalate`, { reason });
    return data;
};

// --- COMMENTS ---
export const getIncidentComments = async (incidentId) => {
    const { data } = await api.get(`/incidents/${incidentId}/comments`);
    return data;
};

export const addIncidentComment = async (incidentId, content, isInternal = false) => {
    const { data } = await api.post(`/incidents/${incidentId}/comments`, { content, isInternal });
    return data;
};

// --- HISTORY ---
export const getIncidentHistory = async (incidentId) => {
    const { data } = await api.get(`/incidents/${incidentId}/history`);
    return data;
};

// --- ATTACHMENTS ---
export const getIncidentAttachments = async (incidentId) => {
    const { data } = await api.get(`/incidents/${incidentId}/attachments`);
    return data;
};

export const uploadIncidentAttachment = async (incidentId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await api.post(`/incidents/${incidentId}/attachments`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
    return data;
};

export const deleteIncidentAttachment = async (attachmentId) => {
    await api.delete(`/incidents/attachments/${attachmentId}`);
};

export default {
    getIncidents,
    getIncidentById,
    getIncidentKPIs,
    getIncidentCategories,
    createIncidentCategory,
    updateIncidentCategory,
    createIncident,
    updateIncident,
    deleteIncident,
    assignIncident,
    resolveIncident,
    closeIncident,
    escalateIncident,
    getIncidentComments,
    addIncidentComment,
    getIncidentHistory,
    getIncidentAttachments,
    uploadIncidentAttachment,
    deleteIncidentAttachment
};
