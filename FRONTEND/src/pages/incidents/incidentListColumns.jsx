import {
  Box,
  Typography,
  Chip,
  Avatar,
  Tooltip,
  IconButton,
  Checkbox,
} from '@mui/material';
import { Visibility, Edit, AccessTime, Warning } from '@mui/icons-material';
import InlineStatusSelect from '../../components/common/InlineStatusSelect';
import { formatRelative } from '../../utils/dateUtils';
import {
  INCIDENT_STATUS_CONFIG,
  INCIDENT_STATUS_OPTIONS,
  INCIDENT_PRIORITY_CONFIG,
  getIncidentSlaColor,
} from './incidentListSort';

/**
 * Colunas DataListTable — modo lista de incidentes.
 */
export function getIncidentColumns({
  textPrimary,
  textSecondary,
  textMuted,
  canWrite,
  selectedIds,
  setSelectedIds,
  onView,
  onEdit,
  onStatusChange,
}) {
  const statusConfig = INCIDENT_STATUS_CONFIG;
  const statusOptions = INCIDENT_STATUS_OPTIONS;
  const priorityConfig = INCIDENT_PRIORITY_CONFIG;

  return [
    {
      id: '__select',
      label: '',
      sortable: false,
      accessor: () => '',
      width: 48,
      minWidth: 48,
      align: 'center',
      renderHeader: ({ paginatedRows }) => {
        const pageIds = paginatedRows.map((i) => i.id);
        const allSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.includes(id));
        const someSelected =
          pageIds.some((id) => selectedIds.includes(id)) && !allSelected;
        return (
          <Checkbox
            size="small"
            checked={allSelected}
            indeterminate={someSelected}
            onChange={() => {
              if (allSelected) {
                setSelectedIds((prev) => prev.filter((id) => !pageIds.includes(id)));
              } else {
                setSelectedIds(pageIds);
              }
            }}
            sx={{
              color: '#64748b',
              '&.Mui-checked': { color: '#667eea' },
              '&.MuiCheckbox-indeterminate': { color: '#667eea' },
            }}
          />
        );
      },
      render: (inc) => (
        <Box onClick={(e) => e.stopPropagation()}>
          <Checkbox
            size="small"
            checked={selectedIds.includes(inc.id)}
            onChange={() =>
              setSelectedIds((prev) =>
                prev.includes(inc.id) ? prev.filter((id) => id !== inc.id) : [...prev, inc.id]
              )
            }
            sx={{ color: '#64748b', '&.Mui-checked': { color: '#667eea' } }}
          />
        </Box>
      ),
    },
    {
      id: 'code',
      label: 'Código',
      width: '10%',
      minWidth: 100,
      accessor: (r) => r.code || '',
      render: (inc) => (
        <Typography sx={{ color: '#818cf8', fontWeight: 600, fontSize: 14 }}>{inc.code}</Typography>
      ),
    },
    {
      id: 'title',
      label: 'Título',
      accessor: (r) => r.title || '',
      cellSx: () => ({
        maxWidth: 260,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }),
      render: (inc) => (
        <Typography sx={{ color: textPrimary, fontSize: 14 }}>{inc.title}</Typography>
      ),
    },
    {
      id: 'categoryName',
      label: 'Categoria',
      accessor: (r) => r.category?.name || '',
      render: (inc) => (
        <Typography sx={{ color: textSecondary, fontSize: 13 }}>
          {inc.category?.name || '—'}
        </Typography>
      ),
    },
    {
      id: 'priority',
      label: 'Prioridade',
      align: 'center',
      accessor: (r) => r.priority || '',
      render: (inc) => {
        const priority = priorityConfig[inc.priority] || priorityConfig.P3;
        return (
          <Chip
            label={priority.label}
            size="small"
            sx={{ bgcolor: priority.bg, color: priority.color, fontWeight: 600, fontSize: 11 }}
          />
        );
      },
    },
    {
      id: 'status',
      label: 'Status',
      align: 'center',
      accessor: (r) => r.status || '',
      render: (inc) => {
        const status = statusConfig[inc.status] || statusConfig.OPEN;
        return (
          <Box onClick={(e) => e.stopPropagation()}>
            {onStatusChange && canWrite ? (
              <InlineStatusSelect
                status={inc.status}
                statusConfig={statusConfig}
                statusOptions={statusOptions}
                onStatusChange={(newStatus) => onStatusChange(inc.id, newStatus)}
              />
            ) : (
              <Chip
                label={status.label}
                size="small"
                sx={{ bgcolor: status.bg, color: status.color, fontWeight: 500, fontSize: 11 }}
              />
            )}
          </Box>
        );
      },
    },
    {
      id: 'slaSort',
      label: 'SLA',
      align: 'center',
      sortable: true,
      accessor: (r) => (r.slaBreached ? 1 : 0),
      render: (inc) => {
        const slaColor = getIncidentSlaColor(inc);
        return (
          <Tooltip title={inc.slaBreached ? 'SLA Estourado!' : 'Dentro do SLA'}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
              {inc.slaBreached ? (
                <Warning sx={{ color: '#ef4444', fontSize: 18 }} />
              ) : (
                <AccessTime sx={{ color: slaColor, fontSize: 18 }} />
              )}
            </Box>
          </Tooltip>
        );
      },
    },
    {
      id: 'assigneeName',
      label: 'Responsável',
      accessor: (r) => r.assignee?.name || '',
      render: (inc) =>
        inc.assignee ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Avatar sx={{ width: 24, height: 24, fontSize: 12, bgcolor: '#2563eb' }}>
              {inc.assignee.name?.[0]}
            </Avatar>
            <Typography sx={{ color: textPrimary, fontSize: 13 }}>{inc.assignee.name}</Typography>
          </Box>
        ) : (
          <Typography sx={{ color: textMuted, fontSize: 13, fontStyle: 'italic' }}>
            Não atribuído
          </Typography>
        ),
    },
    {
      id: 'createdAt',
      label: 'Criado em',
      accessor: (r) => r.createdAt,
      render: (inc) => (
        <Tooltip title={new Date(inc.createdAt).toLocaleString('pt-BR')}>
          <Typography sx={{ color: textSecondary, fontSize: 13 }}>
            {formatRelative(inc.createdAt)}
          </Typography>
        </Tooltip>
      ),
    },
    {
      id: 'actions',
      label: 'Ações',
      align: 'center',
      sortable: false,
      width: 120,
      minWidth: 120,
      render: (inc) => (
        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }} onClick={(e) => e.stopPropagation()}>
          <Tooltip title="Visualizar">
            <IconButton
              size="small"
              onClick={() => onView(inc)}
              sx={{ color: '#818cf8', '&:hover': { bgcolor: 'rgba(129, 140, 248, 0.1)' } }}
            >
              <Visibility fontSize="small" />
            </IconButton>
          </Tooltip>
          {canWrite && inc.status !== 'CLOSED' && (
            <Tooltip title="Editar">
              <IconButton
                size="small"
                onClick={() => onEdit(inc)}
                sx={{ color: '#10b981', '&:hover': { bgcolor: 'rgba(16, 185, 129, 0.1)' } }}
              >
                <Edit fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      ),
    },
  ];
}
