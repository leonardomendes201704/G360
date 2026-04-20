import { Box, Typography } from '@mui/material';
import { format, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { isProjectTaskOverdue } from './projectTaskListSort';

function taskDeadline(t) {
  return t.dueDate || t.endDate;
}

const getPriorityLabel = (p) =>
  ({ HIGH: 'Alta', MEDIUM: 'Média', LOW: 'Baixa', CRITICAL: 'Crítica' })[String(p || '').toUpperCase()] || p;

const getStatusConfig = (status) => {
  const configs = {
    TODO: { label: 'Pendente', bg: 'rgba(14, 165, 233, 0.15)', color: '#0ea5e9' },
    BACKLOG: { label: 'Backlog', bg: 'rgba(100, 116, 139, 0.15)', color: '#64748b' },
    ON_HOLD: { label: 'Em Pausa', bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' },
    IN_PROGRESS: { label: 'Em Progresso', bg: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' },
    DONE: { label: 'Concluído', bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981' },
    BLOCKED: { label: 'Bloqueado', bg: 'rgba(244, 63, 94, 0.15)', color: '#f43f5e' },
    CANCELLED: { label: 'Cancelada', bg: 'rgba(148, 163, 184, 0.15)', color: '#94a3b8' },
  };
  return configs[status] || { label: status, bg: 'rgba(100, 116, 139, 0.15)', color: '#64748b' };
};

const getCategoryConfig = (task) => {
  const category =
    task.category ||
    (task.title?.toLowerCase().includes('reunião') || task.title?.toLowerCase().includes('meeting')
      ? 'meeting'
      : task.title?.toLowerCase().includes('review')
        ? 'review'
        : task.title?.toLowerCase().includes('suporte')
          ? 'support'
          : task.title?.toLowerCase().includes('planning')
            ? 'planning'
            : 'admin');

  const configs = {
    meeting: { label: 'Reunião', bg: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' },
    admin: { label: 'Admin', bg: 'rgba(6, 182, 212, 0.15)', color: '#06b6d4' },
    dev: { label: 'Dev', bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981' },
    review: { label: 'Revisão', bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' },
    support: { label: 'Suporte', bg: 'rgba(244, 63, 94, 0.15)', color: '#f43f5e' },
    planning: { label: 'Planning', bg: 'rgba(37, 99, 235, 0.15)', color: '#2563eb' },
  };
  return configs[category] || configs.admin;
};

const getAvatarGradient = (name) => {
  const gradients = [
    'linear-gradient(135deg, #2563eb, #3b82f6)',
    'linear-gradient(135deg, #10b981, #06b6d4)',
    'linear-gradient(135deg, #f59e0b, #f97316)',
    'linear-gradient(135deg, #f43f5e, #3b82f6)',
  ];
  const index = name ? name.charCodeAt(0) % gradients.length : 0;
  return gradients[index];
};

const getInitials = (name) => {
  if (!name) return '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();
};

function formatDeadline(task, textPrimary, textMuted) {
  const deadline = taskDeadline(task);
  if (!deadline) return '—';
  const date = new Date(deadline);
  if (task.status === 'DONE') {
    return format(date, 'dd MMM', { locale: ptBR });
  }
  if (isToday(date)) return 'Hoje';
  return format(date, 'dd MMM', { locale: ptBR });
}

/**
 * Colunas `DataListTable` — tarefas do projeto (vista lista).
 */
export function getProjectTaskListColumns({
  textPrimary,
  textSecondary,
  textMuted,
  surfaceBg,
  checkboxBorder,
  onTaskToggle,
  onOpenMenu,
}) {
  return [
    {
      id: '__done',
      label: '',
      width: '44px',
      minWidth: 44,
      sortable: false,
      align: 'center',
      render: (task) => {
        const isCompleted = task.status === 'DONE';
        return (
          <Box
            onClick={(e) => {
              e.stopPropagation();
              onTaskToggle(task.id, task.status);
            }}
            sx={{
              width: 20,
              height: 20,
              border: isCompleted ? 'none' : checkboxBorder,
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: isCompleted ? '#10b981' : 'transparent',
              '&:hover': { borderColor: '#2563eb' },
            }}
          >
            {isCompleted && (
              <span className="material-icons-round" style={{ fontSize: 14, color: 'white' }}>
                check
              </span>
            )}
          </Box>
        );
      },
    },
    {
      id: 'task',
      label: 'Tarefa',
      width: '28%',
      minWidth: 140,
      sortable: true,
      accessor: (r) => r.title || r.name || '',
      render: (task) => {
        const isCompleted = task.status === 'DONE';
        const categoryConfig = getCategoryConfig(task);
        return (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Typography
                sx={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: isCompleted ? textMuted : textPrimary,
                  textDecoration: isCompleted ? 'line-through' : 'none',
                }}
              >
                {task.title || task.name}
              </Typography>
              <Box
                sx={{
                  fontSize: '0.55rem',
                  px: 0.75,
                  py: 0.25,
                  borderRadius: '8px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  background: categoryConfig.bg,
                  color: categoryConfig.color,
                }}
              >
                {categoryConfig.label}
              </Box>
            </Box>
            {task.description && (
              <Typography
                sx={{
                  fontSize: '0.65rem',
                  color: textMuted,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: 320,
                }}
              >
                {task.description}
              </Typography>
            )}
          </Box>
        );
      },
    },
    {
      id: 'assignee',
      label: 'Responsável',
      width: '16%',
      minWidth: 100,
      sortable: true,
      accessor: (r) => r.assignee?.name || r.assignedTo?.name || '',
      render: (task) => {
        const assignee = task.assignee || task.assignedTo;
        const name = assignee?.name || '';
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                width: 28,
                height: 28,
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.65rem',
                fontWeight: 600,
                background: assignee ? getAvatarGradient(name) : surfaceBg,
                color: assignee ? '#f1f5f9' : textMuted,
              }}
            >
              {getInitials(name)}
            </Box>
            <Typography sx={{ fontSize: '0.7rem', color: textSecondary }}>{name.split(' ')[0] || 'N/A'}</Typography>
          </Box>
        );
      },
    },
    {
      id: 'deadline',
      label: 'Prazo',
      width: '12%',
      minWidth: 88,
      sortable: true,
      accessor: (r) => {
        const d = taskDeadline(r);
        return d ? new Date(d).getTime() : 0;
      },
      render: (task) => {
        const overdue = isProjectTaskOverdue(task);
        const done = task.status === 'DONE';
        const dl = taskDeadline(task);
        const today = dl && isToday(new Date(dl));
        return (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.75,
              fontSize: '0.7rem',
              color: overdue ? '#f43f5e' : today ? '#f59e0b' : done ? '#10b981' : '#94a3b8',
            }}
          >
            <span className="material-icons-round" style={{ fontSize: 16 }}>
              {done ? 'check_circle' : 'event'}
            </span>
            {formatDeadline(task)}
          </Box>
        );
      },
    },
    {
      id: 'priority',
      label: 'Prioridade',
      width: '12%',
      minWidth: 88,
      sortable: true,
      accessor: (r) => r.priority || '',
      render: (task) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '8px',
              background:
                task.priority === 'HIGH' || task.priority === 'CRITICAL'
                  ? '#f43f5e'
                  : task.priority === 'MEDIUM'
                    ? '#f59e0b'
                    : '#10b981',
            }}
          />
          <Typography sx={{ color: textSecondary, fontSize: '0.65rem', fontWeight: 600 }}>
            {getPriorityLabel(task.priority)}
          </Typography>
        </Box>
      ),
    },
    {
      id: 'status',
      label: 'Status',
      width: '12%',
      minWidth: 96,
      sortable: true,
      accessor: (r) => r.status || '',
      render: (task) => {
        const statusConfig = getStatusConfig(task.status);
        return (
          <Box
            sx={{
              py: 0.5,
              px: 1,
              borderRadius: '8px',
              fontSize: '0.6rem',
              fontWeight: 600,
              textAlign: 'center',
              display: 'inline-block',
              background: statusConfig.bg,
              color: statusConfig.color,
            }}
          >
            {statusConfig.label}
          </Box>
        );
      },
    },
    {
      id: 'actions',
      label: '',
      width: '48px',
      minWidth: 48,
      sortable: false,
      align: 'right',
      render: (task) => (
        <Box
          component="button"
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenMenu(e, task);
          }}
          sx={{
            width: 32,
            height: 32,
            borderRadius: '8px',
            background: 'transparent',
            border: 'none',
            color: textMuted,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            '&:hover': { background: surfaceBg, color: textPrimary },
          }}
        >
          <span className="material-icons-round" style={{ fontSize: 18 }}>
            more_vert
          </span>
        </Box>
      ),
    },
  ];
}
