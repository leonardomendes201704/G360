import { Delete, CalendarToday, Warning, Edit } from '@mui/icons-material';
import { Box, Typography, Checkbox, Avatar, Chip, IconButton, Tooltip } from '@mui/material';
import InlineStatusSelect from '../../components/common/InlineStatusSelect';
import { formatDueDate, formatDate } from '../../utils/dateUtils';
import { GENERAL_TASK_STATUS_CONFIG, getTaskDeadlineDate, isTaskOverdueForList } from './taskListSort';

const getPriorityLabel = (p) =>
  ({ HIGH: 'Alta', MEDIUM: 'Média', LOW: 'Baixa', CRITICAL: 'Crítica' })[String(p || '').toUpperCase()] || p;

/** Mesma escala que incidentes / lista de projetos — chips ~21px */
const chipDenseSx = {
  height: 21,
  fontWeight: 600,
  fontSize: '0.525rem',
  '& .MuiChip-label': { px: 0.75, lineHeight: 1.2, whiteSpace: 'nowrap' },
};

const PRIORITY_CHIP = {
  CRITICAL: { bg: 'rgba(239, 68, 68, 0.12)', color: '#ef4444' },
  HIGH: { bg: 'rgba(249, 115, 22, 0.12)', color: '#f97316' },
  MEDIUM: { bg: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6' },
  LOW: { bg: 'rgba(148, 163, 184, 0.12)', color: '#94a3b8' },
};

/**
 * Colunas `DataListTable` — tarefas gerais (vista lista, modo compacto).
 */
export function getGeneralTaskListColumns({
  canWrite,
  selectedIds,
  setSelectedIds,
  onTaskClick,
  onDeleteTask,
  onStatusChange,
  currentUserId,
  activeTimerTaskId,
  onTimerToggle,
}) {
  return [
    {
      id: '__select',
      label: '',
      sortable: false,
      accessor: () => '',
      width: '3%',
      minWidth: 44,
      align: 'center',
      renderHeader: ({ paginatedRows }) => {
        const pageIds = paginatedRows.map((t) => t.id);
        const allSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.includes(id));
        const someSelected = pageIds.some((id) => selectedIds.includes(id)) && !allSelected;
        return (
          <Checkbox
            size="small"
            checked={allSelected}
            indeterminate={someSelected}
            onChange={() => {
              if (allSelected) {
                setSelectedIds((prev) => prev.filter((id) => !pageIds.includes(id)));
              } else {
                setSelectedIds((ids) => [...new Set([...ids, ...pageIds])]);
              }
            }}
            sx={{
              color: '#94a3b8',
              '&.Mui-checked': { color: '#667eea' },
              '&.MuiCheckbox-indeterminate': { color: '#667eea' },
            }}
          />
        );
      },
      render: (task) => (
        <Box onClick={(e) => e.stopPropagation()}>
          <Checkbox
            size="small"
            checked={selectedIds.includes(task.id)}
            onChange={() =>
              setSelectedIds((prev) =>
                prev.includes(task.id) ? prev.filter((id) => id !== task.id) : [...prev, task.id]
              )
            }
            sx={{ color: '#94a3b8', '&.Mui-checked': { color: '#667eea' } }}
          />
        </Box>
      ),
    },
    {
      id: 'title',
      label: 'Tarefa',
      width: '22%',
      minWidth: 180,
      accessor: (r) => r.title || r.name || '',
      cellSx: () => ({
        maxWidth: 280,
        verticalAlign: 'middle',
      }),
      render: (task) => (
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ color: 'text.primary', fontSize: '0.7rem', fontWeight: 600, lineHeight: 1.3 }}>
            {task.title || task.name}
          </Typography>
          <Typography
            sx={{
              color: 'text.secondary',
              fontSize: '0.6rem',
              display: 'block',
              mt: 0.25,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {task.description
              ? task.description.length > 50
                ? `${task.description.substring(0, 50)}...`
                : task.description
              : 'Sem descrição'}
          </Typography>
        </Box>
      ),
    },
    {
      id: 'type',
      label: 'Tipo',
      width: '11%',
      minWidth: 92,
      sortable: true,
      accessor: (t) => {
        if (t.riskId) return 'RISCO';
        if (t.projectId) return 'PROJETO';
        if (t.isPersonal) return 'PESSOAL';
        return 'GERAL';
      },
      render: (task) => (
        <Box>
          <Chip
            size="small"
            label={task.riskId ? 'RISCO' : task.projectId ? 'PROJETO' : task.isPersonal ? 'PESSOAL' : 'GERAL'}
            sx={{
              ...chipDenseSx,
              fontWeight: 700,
              bgcolor: task.riskId ? 'rgba(239, 68, 68, 0.12)' : 'rgba(241, 245, 249, 0.9)',
              color: task.riskId ? '#dc2626' : '#475569',
              border: task.riskId ? '1px solid rgba(239, 68, 68, 0.25)' : '1px solid rgba(148, 163, 184, 0.35)',
            }}
          />
          {task.risk && (
            <Typography
              variant="caption"
              sx={{ display: 'block', color: '#dc2626', fontSize: '0.55rem', fontWeight: 600, mt: 0.25, lineHeight: 1.2 }}
            >
              {task.risk.title?.length > 25 ? `${task.risk.title.substring(0, 25)}...` : task.risk.title}
            </Typography>
          )}
        </Box>
      ),
    },
    {
      id: 'assigneeName',
      label: 'Responsável',
      width: '12%',
      minWidth: 128,
      sortable: true,
      accessor: (t) => t.assignee?.name || '',
      render: (task) =>
        task.assignee ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
            <Avatar sx={{ width: 18, height: 18, fontSize: '0.5rem', bgcolor: '#2563eb' }}>
              {task.assignee.name?.[0] ?? '?'}
            </Avatar>
            <Typography
              sx={{
                color: 'text.primary',
                fontSize: '0.6rem',
                minWidth: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {task.assignee.name}
            </Typography>
          </Box>
        ) : (
          <Typography sx={{ color: 'text.secondary', fontSize: '0.6rem', fontStyle: 'italic' }}>
            Não atribuído
          </Typography>
        ),
    },
    {
      id: 'status',
      label: 'Status',
      width: '12%',
      minWidth: 118,
      sortable: true,
      accessor: (t) => t.status || '',
      cellSx: () => ({
        verticalAlign: 'middle',
        whiteSpace: 'nowrap',
      }),
      render: (task) => {
        const cfg = GENERAL_TASK_STATUS_CONFIG[task.status] || {
          label: task.status || '—',
          color: '#64748b',
          bg: 'rgba(100, 116, 139, 0.15)',
        };
        return (
          <Box onClick={(e) => e.stopPropagation()} sx={{ display: 'flex', justifyContent: 'flex-start', minWidth: 0 }}>
            {onStatusChange && canWrite ? (
              <InlineStatusSelect
                status={task.status}
                statusConfig={GENERAL_TASK_STATUS_CONFIG}
                dense
                onStatusChange={(newStatus) => onStatusChange(task.id, newStatus)}
              />
            ) : (
              <Chip
                size="small"
                label={cfg.label}
                sx={{
                  ...chipDenseSx,
                  fontWeight: 500,
                  bgcolor: cfg.bg,
                  color: cfg.color,
                  border: `1px solid ${cfg.color}33`,
                  maxWidth: '100%',
                  '& .MuiChip-label': {
                    px: 0.75,
                    lineHeight: 1.2,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  },
                }}
              />
            )}
          </Box>
        );
      },
    },
    {
      id: 'priority',
      label: 'Prioridade',
      width: '10%',
      minWidth: 96,
      sortable: true,
      accessor: (t) => String(t.priority || ''),
      render: (task) => {
        const pri = PRIORITY_CHIP[String(task.priority || '').toUpperCase()] || PRIORITY_CHIP.MEDIUM;
        return (
          <Chip
            size="small"
            label={getPriorityLabel(task.priority)}
            sx={{
              ...chipDenseSx,
              bgcolor: pri.bg,
              color: pri.color,
              border: `1px solid ${pri.color}33`,
            }}
          />
        );
      },
    },
    {
      id: 'due',
      label: 'Vencimento',
      width: '12%',
      minWidth: 108,
      sortable: true,
      accessor: (t) => getTaskDeadlineDate(t)?.getTime() ?? 0,
      render: (task) => {
        const deadlineDate = getTaskDeadlineDate(task);
        const overdue = isTaskOverdueForList(task);
        if (!deadlineDate) {
          return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#94a3b8', minWidth: 0 }}>
              <CalendarToday sx={{ fontSize: '1.125rem', flexShrink: 0, opacity: 0.6 }} />
              <Typography sx={{ fontWeight: 400, fontSize: '0.6rem', lineHeight: 1.2 }}>—</Typography>
            </Box>
          );
        }
        const fd = formatDueDate(deadlineDate);
        const label = typeof fd === 'string' ? fd : fd.label;
        const tone = typeof fd === 'string' ? '#94a3b8' : fd.color;
        return (
          <Tooltip title={formatDate(deadlineDate)} placement="top" arrow>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                color: overdue ? '#dc2626' : tone,
                minWidth: 0,
                cursor: 'default',
              }}
            >
              {overdue ? (
                <Warning sx={{ fontSize: '1.125rem', flexShrink: 0 }} />
              ) : (
                <CalendarToday sx={{ fontSize: '1.125rem', flexShrink: 0 }} />
              )}
              <Typography sx={{ fontWeight: overdue ? 600 : 500, fontSize: '0.6rem', lineHeight: 1.2 }}>
                {label}
              </Typography>
            </Box>
          </Tooltip>
        );
      },
    },
    {
      id: 'actions',
      label: 'Ações',
      sortable: false,
      width: '14%',
      minWidth: 108,
      align: 'right',
      cellSx: () => ({
        verticalAlign: 'middle',
        whiteSpace: 'nowrap',
      }),
      render: (task) => (
        <Box
          sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.25, flexWrap: 'nowrap', alignItems: 'center' }}
          onClick={(e) => e.stopPropagation()}
        >
          {task.assignee?.id === currentUserId && onTimerToggle && (
            <IconButton
              size="small"
              title={activeTimerTaskId === task.id ? 'Parar timer' : 'Iniciar timer'}
              onClick={() => onTimerToggle(task)}
              sx={{
                p: '4px',
                color: activeTimerTaskId === task.id ? '#10b981' : '#64748b',
                bgcolor: activeTimerTaskId === task.id ? 'rgba(16,185,129,0.12)' : 'transparent',
                animation: activeTimerTaskId === task.id ? 'taskTimerPulse 1.5s ease-in-out infinite' : 'none',
                '@keyframes taskTimerPulse': {
                  '0%, 100%': { opacity: 1 },
                  '50%': { opacity: 0.6 },
                },
                '&:hover': {
                  bgcolor: activeTimerTaskId === task.id ? 'rgba(239,68,68,0.12)' : 'rgba(0,0,0,0.04)',
                  color: activeTimerTaskId === task.id ? '#ef4444' : '#0f172a',
                },
              }}
            >
              <span className="material-icons-round" style={{ fontSize: '1.125rem' }}>
                {activeTimerTaskId === task.id ? 'stop' : 'play_arrow'}
              </span>
            </IconButton>
          )}
          {canWrite && (
            <IconButton size="small" onClick={() => onTaskClick(task)} sx={{ p: '4px', color: '#64748b', '&:hover': { color: '#0f172a' } }}>
              <Edit sx={{ fontSize: '1.125rem' }} />
            </IconButton>
          )}
          {canWrite && (
            <IconButton
              size="small"
              onClick={() => onDeleteTask(task.id)}
              sx={{ p: '4px', color: '#cbd5e1', '&:hover': { color: '#ef4444' } }}
            >
              <Delete sx={{ fontSize: '1.125rem' }} />
            </IconButton>
          )}
        </Box>
      ),
    },
  ];
}
