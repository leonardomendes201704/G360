import { Delete, CalendarToday, Warning, Edit } from '@mui/icons-material';
import { Box, Typography, Checkbox } from '@mui/material';
import StatusChip from '../../components/common/StatusChip';
import InlineStatusSelect from '../../components/common/InlineStatusSelect';
import { formatRelative } from '../../utils/dateUtils';
import {
  GENERAL_TASK_STATUS_CONFIG,
  GENERAL_TASK_STATUS_OPTIONS,
  getTaskDeadline,
  isTaskOverdueForList,
} from './taskListSort';

const getPriorityLabel = (p) =>
  ({ HIGH: 'Alta', MEDIUM: 'Média', LOW: 'Baixa', CRITICAL: 'Crítica' })[String(p || '').toUpperCase()] || p;
const getPriorityColor = (p) =>
  ({ CRITICAL: '#ef4444', HIGH: '#f97316', MEDIUM: '#3b82f6', LOW: '#94a3b8' })[String(p || '').toUpperCase()] ||
  '#94a3b8';

/**
 * Colunas `DataListTable` — tarefas gerais (vista lista).
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
      minWidth: 0,
      accessor: (r) => r.title || r.name || '',
      render: (task) => (
        <Box>
          <Typography variant="body2" fontWeight="700" color="text.primary">
            {task.title || task.name}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
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
      minWidth: 0,
      sortable: true,
      accessor: (t) => {
        if (t.riskId) return 'RISCO';
        if (t.projectId) return 'PROJETO';
        if (t.isPersonal) return 'PESSOAL';
        return 'GERAL';
      },
      render: (task) => (
        <Box>
          <Box
            sx={{
              display: 'inline-block',
              px: 1,
              py: 0.3,
              borderRadius: '8px',
              bgcolor: task.riskId ? 'rgba(239, 68, 68, 0.12)' : '#f1f5f9',
              color: task.riskId ? '#dc2626' : '#475569',
              fontSize: '0.7rem',
              fontWeight: 700,
            }}
          >
            {task.riskId ? 'RISCO' : task.projectId ? 'PROJETO' : task.isPersonal ? 'PESSOAL' : 'GERAL'}
          </Box>
          {task.risk && (
            <Typography variant="caption" sx={{ display: 'block', color: '#dc2626', fontSize: '0.65rem', fontWeight: 600 }}>
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
      minWidth: 0,
      sortable: true,
      accessor: (t) => t.assignee?.name || '',
      render: (task) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: '8px',
              bgcolor: '#e0e7ff',
              color: '#1e40af',
              fontSize: '0.75rem',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {task.assignee ? task.assignee.name.charAt(0) : '?'}
          </Box>
          <Typography variant="body2" fontWeight="600" color="text.primary" fontSize="0.85rem" noWrap>
            {task.assignee ? task.assignee.name.split(' ')[0] : 'N/A'}
          </Typography>
        </Box>
      ),
    },
    {
      id: 'status',
      label: 'Status',
      width: '12%',
      minWidth: 0,
      sortable: true,
      accessor: (t) => t.status || '',
      render: (task) => (
        <Box onClick={(e) => e.stopPropagation()}>
          {onStatusChange && canWrite ? (
            <InlineStatusSelect
              status={task.status}
              statusConfig={GENERAL_TASK_STATUS_CONFIG}
              statusOptions={GENERAL_TASK_STATUS_OPTIONS}
              onStatusChange={(newStatus) => onStatusChange(task.id, newStatus)}
            />
          ) : (
            <StatusChip
              status={task.status}
              label={GENERAL_TASK_STATUS_CONFIG[task.status]?.label || task.status}
            />
          )}
        </Box>
      ),
    },
    {
      id: 'priority',
      label: 'Prioridade',
      width: '10%',
      minWidth: 0,
      sortable: true,
      accessor: (t) => String(t.priority || ''),
      render: (task) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 8, height: 8, borderRadius: '8px', bgcolor: getPriorityColor(task.priority) }} />
          <Typography variant="body2" fontSize="0.8rem" color="text.secondary">
            {getPriorityLabel(task.priority)}
          </Typography>
        </Box>
      ),
    },
    {
      id: 'due',
      label: 'Vencimento',
      width: '12%',
      minWidth: 0,
      sortable: true,
      accessor: (t) => {
        const d = getTaskDeadline(t);
        return d ? new Date(d).getTime() : 0;
      },
      render: (task) => {
        const deadline = getTaskDeadline(task);
        const overdue = isTaskOverdueForList(task);
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: overdue ? '#dc2626' : '#64748b' }}>
            {overdue ? <Warning fontSize="inherit" /> : <CalendarToday fontSize="inherit" />}
            <Typography variant="body2" fontWeight={overdue ? 700 : 400} fontSize="0.85rem">
              {deadline ? formatRelative(deadline) : '-'}
            </Typography>
          </Box>
        );
      },
    },
    {
      id: 'actions',
      label: 'Ações',
      sortable: false,
      width: '14%',
      minWidth: 0,
      align: 'right',
      render: (task) => (
        <Box
          sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, flexWrap: 'wrap' }}
          onClick={(e) => e.stopPropagation()}
        >
          {task.assignee?.id === currentUserId && onTimerToggle && (
            <Box
              component="button"
              type="button"
              title={activeTimerTaskId === task.id ? 'Parar timer' : 'Iniciar timer'}
              onClick={() => onTimerToggle(task)}
              sx={{
                border: 'none',
                bgcolor: activeTimerTaskId === task.id ? 'rgba(16,185,129,0.15)' : 'transparent',
                cursor: 'pointer',
                p: 0.4,
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                color: activeTimerTaskId === task.id ? '#10b981' : '#64748b',
                transition: 'all 0.15s',
                animation: activeTimerTaskId === task.id ? 'taskTimerPulse 1.5s ease-in-out infinite' : 'none',
                '@keyframes taskTimerPulse': {
                  '0%, 100%': { opacity: 1 },
                  '50%': { opacity: 0.6 },
                },
                '&:hover': { bgcolor: 'rgba(0,0,0,0.04)', color: activeTimerTaskId === task.id ? '#ef4444' : '#0f172a' },
              }}
            >
              <span className="material-icons-round" style={{ fontSize: 16 }}>
                {activeTimerTaskId === task.id ? 'stop' : 'play_arrow'}
              </span>
            </Box>
          )}
          {canWrite && (
            <Box
              component="button"
              type="button"
              onClick={() => onTaskClick(task)}
              sx={{ border: 'none', bgcolor: 'transparent', cursor: 'pointer', color: '#64748b', p: 0, '&:hover': { color: '#0f172a' } }}
            >
              <Edit fontSize="small" />
            </Box>
          )}
          {canWrite && (
            <Box
              component="button"
              type="button"
              onClick={() => onDeleteTask(task.id)}
              sx={{ border: 'none', bgcolor: 'transparent', cursor: 'pointer', color: '#cbd5e1', p: 0, '&:hover': { color: '#ef4444' } }}
            >
              <Delete fontSize="small" />
            </Box>
          )}
        </Box>
      ),
    },
  ];
}
