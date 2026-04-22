/** Tarefas gerais — ordenação (DataListTable) e metadados de status/prioridade. */
import { startOfDay } from 'date-fns';
import { parseLocalCalendarDateInput } from '../../utils/dateUtils';

export const GENERAL_TASK_STATUS_CONFIG = {
  BACKLOG: { label: 'Backlog', color: '#64748b', bg: 'rgba(100, 116, 139, 0.18)' },
  TODO: { label: 'A Fazer', color: '#64748b', bg: 'rgba(100, 116, 139, 0.15)' },
  IN_PROGRESS: { label: 'Em Andamento', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)' },
  ON_HOLD: { label: 'Em Pausa', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
  DONE: { label: 'Concluído', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' },
  COMPLETED: { label: 'Concluído', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' },
  CANCELLED: { label: 'Cancelado', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' },
  BLOCKED: { label: 'Bloqueado', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
  REVIEW: { label: 'Em Revisão', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)' },
};

export const GENERAL_TASK_STATUS_OPTIONS = [
  { value: 'BACKLOG', label: 'Backlog', color: '#64748b' },
  { value: 'TODO', label: 'A Fazer', color: '#64748b' },
  { value: 'IN_PROGRESS', label: 'Em Andamento', color: '#3b82f6' },
  { value: 'ON_HOLD', label: 'Em Pausa', color: '#f59e0b' },
  { value: 'REVIEW', label: 'Em Revisão', color: '#8b5cf6' },
  { value: 'DONE', label: 'Concluído', color: '#10b981' },
  { value: 'BLOCKED', label: 'Bloqueado', color: '#f59e0b' },
  { value: 'CANCELLED', label: 'Cancelado', color: '#ef4444' },
];

const PRI_ORDER = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

export function getTaskDeadline(task) {
  if (!task || typeof task !== 'object') return null;
  return task.dueDate ?? task.due_date ?? task.endDate ?? task.end_date ?? null;
}

/** `Date` local para vencimento (lista, ordenação, atraso) — ver TAR-04. */
export function getTaskDeadlineDate(task) {
  return parseLocalCalendarDateInput(getTaskDeadline(task));
}

export function isTaskOverdueForList(task) {
  const deadline = getTaskDeadlineDate(task);
  if (!deadline) return false;
  if (['DONE', 'COMPLETED', 'CANCELLED'].includes(task.status)) return false;
  return startOfDay(deadline) < startOfDay(new Date());
}

function typeSortValue(task) {
  if (task.riskId) return 0;
  if (task.projectId) return 1;
  if (task.isPersonal) return 2;
  return 3;
}

/**
 * @param {Array} rows
 * @param {string} orderBy
 * @param {'asc'|'desc'} order
 */
export function sortGeneralTaskRows(rows, orderBy, order) {
  const mult = order === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    let cmp = 0;
    switch (orderBy) {
      case 'title':
        cmp = String(a.title || a.name || '').localeCompare(String(b.title || b.name || ''), 'pt-BR', { sensitivity: 'base' });
        break;
      case 'type':
        cmp = typeSortValue(a) - typeSortValue(b);
        break;
      case 'assigneeName':
        cmp = String(a.assignee?.name || '').localeCompare(String(b.assignee?.name || ''), 'pt-BR', { sensitivity: 'base' });
        break;
      case 'status':
        cmp = String(a.status || '').localeCompare(String(b.status || ''), 'pt-BR', { sensitivity: 'base' });
        break;
      case 'priority': {
        const pa = PRI_ORDER[String(a.priority || '').toUpperCase()] ?? 99;
        const pb = PRI_ORDER[String(b.priority || '').toUpperCase()] ?? 99;
        cmp = pa - pb;
        break;
      }
      case 'due': {
        const da = getTaskDeadlineDate(a)?.getTime() ?? 0;
        const db = getTaskDeadlineDate(b)?.getTime() ?? 0;
        cmp = da - db;
        break;
      }
      default:
        cmp = 0;
    }
    return mult * cmp;
  });
}
