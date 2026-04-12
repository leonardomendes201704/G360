/**
 * Centralized Status Configuration for G360
 * Maps status codes to display labels, colors (severity), and variants.
 */

export const STATUS_CONFIG = {
    // --- Projects ---
    'PLANNING': { label: 'Planejamento', color: 'default' }, // Gray
    'IN_PROGRESS': { label: 'Em Andamento', color: 'primary' }, // Blue
    'COMPLETED': { label: 'Concluído', color: 'success' }, // Green
    'CANCELLED': { label: 'Cancelado', color: 'error' }, // Red

    // --- Tasks ---
    'TODO': { label: 'A Fazer', color: 'default' }, // Gray
    'DOING': { label: 'Em Progresso', color: 'primary' }, // Blue
    'REVIEW': { label: 'Em Revisão', color: 'warning' }, // Yellow
    'DONE': { label: 'Concluído', color: 'success' }, // Green

    // --- Change Requests (GMUD) ---
    'DRAFT': { label: 'Rascunho', color: 'default' }, // Gray
    'PENDING_APPROVAL': { label: 'Em Aprovação', color: 'warning' }, // Yellow
    'APPROVED': { label: 'Aprovada', color: 'success' }, // Green
    'APPROVED_WAITING_EXECUTION': { label: 'Aprovado (Aguardando Execução)', color: 'info' }, // Blue
    'REJECTED': { label: 'Rejeitada', color: 'error' }, // Red
    'REVISION_REQUESTED': { label: 'Revisão Solicitada', color: 'warning' }, // Yellow - NEW
    'EXECUTED': { label: 'Executada com Sucesso', color: 'success' },
    'FAILED': { label: 'Falha na Execução', color: 'error' },
    'WAITING_CAB': { label: 'Aguardando CAB', color: 'warning' }, // Yellow

    // --- Incidents ---
    'OPEN': { label: 'Aberto', color: 'error' },
    'IN_PROGRESS': { label: 'Em Andamento', color: 'primary' },
    'PENDING': { label: 'Pendente', color: 'warning' },
    'RESOLVED': { label: 'Resolvido', color: 'success' },
    'CLOSED': { label: 'Fechado', color: 'default' },

    // --- Assets ---
    'PROPRIO': { label: 'Próprio', color: 'success' },
    'LOCADO': { label: 'Locado', color: 'warning' },
    'MANUTENCAO': { label: 'Em Manutenção', color: 'error' },
    'DESATIVADO': { label: 'Desativado', color: 'default' },
    'IN_STOCK': { label: 'Em Estoque', color: 'default' },

    // --- Expenses ---
    'PREVISTO': { label: 'Previsto', color: 'default' }, // Gray
    'PAGO': { label: 'Pago', color: 'success' }, // Green
    'ATRASADO': { label: 'Atrasado', color: 'error' }, // Red
    'CANCELADO': { label: 'Cancelado', color: 'error' }, // Red

    // --- Contracts (Mapped from computed status) ---
    'VIGENTE': { label: 'Vigente', color: 'success' },
    'A VENCER': { label: 'A Vencer', color: 'warning' },
    'VENCIDO': { label: 'Vencido', color: 'error' },

    // --- Generic Fallback ---
    'ACTIVE': { label: 'Ativo', color: 'success' },
    'INACTIVE': { label: 'Inativo', color: 'default' }
};

/**
 * Returns the configuration for a given status code.
 * @param {string} status The status code (e.g., 'IN_PROGRESS')
 * @returns {object} { label, color }
 */
export const getStatusConfig = (status) => {
    if (!status) return { label: '-', color: 'default' };

    const config = STATUS_CONFIG[status.toUpperCase()] || STATUS_CONFIG[status];
    if (config) return config;

    // Fallback for unknown status
    return { label: status, color: 'default' };
};
