/** Ordenação — tarefas do projeto (`DataListTable`, vista Lista). */

import { startOfDay } from 'date-fns';

const STATUS_ORDER = {
  BLOCKED: 0,
  BACKLOG: 1,
  TODO: 2,
  ON_HOLD: 3,
  IN_PROGRESS: 4,
  DONE: 5,
  CANCELLED: 6,
  COMPLETED: 5,
};

function taskDeadline(t) {
  return t.dueDate || t.endDate;
}

function statusRank(status) {
  const s = String(status || '').toUpperCase();
  return STATUS_ORDER[s] ?? 99;
}

const PRIORITY_RANK = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

function priorityRank(p) {
  return PRIORITY_RANK[String(p || '').toUpperCase()] ?? 0;
}

export function sortProjectTaskRows(rows, orderBy, order) {
  const mult = order === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    let cmp = 0;
    switch (orderBy) {
      case 'task':
        cmp = String(a.title || a.name || '').localeCompare(String(b.title || b.name || ''), 'pt-BR', { sensitivity: 'base' });
        break;
      case 'assignee': {
        const na = a.assignee?.name || a.assignedTo?.name || '';
        const nb = b.assignee?.name || b.assignedTo?.name || '';
        cmp = String(na).localeCompare(String(nb), 'pt-BR', { sensitivity: 'base' });
        break;
      }
      case 'deadline': {
        const da = taskDeadline(a) ? new Date(taskDeadline(a)).getTime() : 0;
        const db = taskDeadline(b) ? new Date(taskDeadline(b)).getTime() : 0;
        cmp = da - db;
        break;
      }
      case 'priority':
        cmp = priorityRank(a.priority) - priorityRank(b.priority);
        break;
      case 'status':
        cmp = statusRank(a.status) - statusRank(b.status);
        break;
      default:
        cmp = 0;
    }
    return mult * cmp;
  });
}

/** Usado na coluna prazo (cor/atraso) — espelha DarkTaskList. */
export function isProjectTaskOverdue(task) {
  const deadline = taskDeadline(task);
  if (!deadline) return false;
  if (task.status === 'DONE' || task.status === 'COMPLETED' || task.status === 'CANCELLED') return false;
  const deadlineDate = startOfDay(new Date(deadline));
  const todayDate = startOfDay(new Date());
  return deadlineDate < todayDate;
}
