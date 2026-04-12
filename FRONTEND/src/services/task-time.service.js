import api from './api';

// Iniciar timer
export const startTaskTimer = async (taskId) => {
    const { data } = await api.post(`/tasks/${taskId}/time/start`);
    return data;
};

// Parar timer
export const stopTaskTimer = async (taskId, notes = '') => {
    const { data } = await api.post(`/tasks/${taskId}/time/stop`, { notes });
    return data;
};

// Timer ativo do usuário atual
export const getActiveTimer = async () => {
    const { data } = await api.get('/tasks/time/active');
    return data;
};

// Histórico de tempo de uma tarefa
export const getTaskTimeHistory = async (taskId) => {
    const { data } = await api.get(`/tasks/${taskId}/time`);
    return data;
};

// Relatório de horas com filtros
export const getTimeReport = async (filters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            params.append(key, value);
        }
    });
    const { data } = await api.get(`/tasks/time-report?${params.toString()}`);
    return data;
};

// Exportar relatório
export const exportTimeReport = async (filters = {}, format = 'csv') => {
    const params = new URLSearchParams({ format });
    Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            params.append(key, value);
        }
    });
    const response = await api.get(`/tasks/time-report/export?${params.toString()}`, {
        responseType: 'blob'
    });

    // Trigger download
    const blob = new Blob([response.data]);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio_horas.${format === 'xlsx' ? 'xls' : 'csv'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
};
