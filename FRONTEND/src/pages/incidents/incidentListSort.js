/** Ordenação da lista de incidentes (DataListTable / modo lista). */

export const INCIDENT_STATUS_CONFIG = {
  OPEN: { label: 'Aberto', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
  IN_PROGRESS: { label: 'Em Andamento', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)' },
  PENDING: { label: 'Pendente', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)' },
  RESOLVED: { label: 'Resolvido', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' },
  CLOSED: { label: 'Fechado', color: '#64748b', bg: 'rgba(100, 116, 139, 0.15)' },
};

export const INCIDENT_STATUS_OPTIONS = [
  { value: 'OPEN', label: 'Aberto', color: '#f59e0b' },
  { value: 'IN_PROGRESS', label: 'Em Andamento', color: '#3b82f6' },
  { value: 'PENDING', label: 'Pendente', color: '#8b5cf6' },
  { value: 'RESOLVED', label: 'Resolvido', color: '#10b981' },
  { value: 'CLOSED', label: 'Fechado', color: '#64748b' },
];

export const INCIDENT_PRIORITY_CONFIG = {
  P1: { label: 'P1 - Crítica', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' },
  P2: { label: 'P2 - Alta', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
  P3: { label: 'P3 - Média', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)' },
  P4: { label: 'P4 - Baixa', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' },
};

const PRI_ORDER = { P1: 1, P2: 2, P3: 3, P4: 4 };

export function getIncidentSlaColor(inc) {
  if (inc.slaBreached) return '#ef4444';
  if (inc.status === 'CLOSED' || inc.status === 'RESOLVED') return '#10b981';
  const now = new Date();
  const created = new Date(inc.createdAt);
  const due = new Date(inc.slaResolveDue);
  const pct = ((now - created) / (due - created)) * 100;
  return pct >= 80 ? '#f59e0b' : '#10b981';
}

/**
 * @param {Array} rows
 * @param {string} orderBy — id da coluna DataListTable
 * @param {'asc'|'desc'} order
 */
export function sortIncidentsRows(rows, orderBy, order) {
  const mult = order === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    let cmp = 0;
    switch (orderBy) {
      case 'code':
        cmp = String(a.code || '').localeCompare(String(b.code || ''), 'pt-BR', { numeric: true, sensitivity: 'base' });
        break;
      case 'title':
        cmp = String(a.title || '').localeCompare(String(b.title || ''), 'pt-BR', { sensitivity: 'base' });
        break;
      case 'categoryName':
        cmp = String(a.category?.name || '').localeCompare(String(b.category?.name || ''), 'pt-BR', { sensitivity: 'base' });
        break;
      case 'priority': {
        const pa = PRI_ORDER[a.priority] ?? 99;
        const pb = PRI_ORDER[b.priority] ?? 99;
        cmp = pa - pb;
        break;
      }
      case 'status':
        cmp = String(a.status || '').localeCompare(String(b.status || ''), 'pt-BR', { sensitivity: 'base' });
        break;
      case 'slaSort': {
        const sa = a.slaBreached ? 1 : 0;
        const sb = b.slaBreached ? 1 : 0;
        cmp = sa - sb;
        if (cmp === 0) {
          cmp = new Date(a.slaResolveDue || 0).getTime() - new Date(b.slaResolveDue || 0).getTime();
        }
        break;
      }
      case 'assigneeName':
        cmp = String(a.assignee?.name || '').localeCompare(String(b.assignee?.name || ''), 'pt-BR', { sensitivity: 'base' });
        break;
      case 'createdAt':
        cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        break;
      default:
        cmp = 0;
    }
    return mult * cmp;
  });
}
