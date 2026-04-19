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
  INCIDENT_PRIORITY_CONFIG,
  getIncidentSlaColor,
} from './incidentListSort';

/** Cabeçalho com ordenação centrado (MUI TableSortLabel é flex e tende para a esquerda). */
const headerSxCenteredSort = {
  '& .MuiTableSortLabel-root': {
    justifyContent: 'center',
    width: '100%',
  },
};

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
  const priorityConfig = INCIDENT_PRIORITY_CONFIG;

  return [
    {
      id: '__select',
      label: '',
      sortable: false,
      accessor: () => '',
      width: 36,
      minWidth: 36,
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
      minWidth: 75,
      accessor: (r) => r.code || '',
      render: (inc) => (
        <Typography sx={{ color: '#818cf8', fontWeight: 600, fontSize: '0.64rem', lineHeight: 1.3 }}>{inc.code}</Typography>
      ),
    },
    {
      id: 'title',
      label: 'Título',
      accessor: (r) => r.title || '',
      cellSx: () => ({
        maxWidth: 195,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }),
      render: (inc) => (
        <Typography sx={{ color: textPrimary, fontSize: '0.7rem', lineHeight: 1.3 }}>{inc.title}</Typography>
      ),
    },
    {
      id: 'categoryName',
      label: 'Categoria',
      accessor: (r) => r.category?.name || '',
      render: (inc) => (
        <Typography sx={{ color: textSecondary, fontSize: '0.6rem' }}>
          {inc.category?.name || '—'}
        </Typography>
      ),
    },
    {
      id: 'priority',
      label: 'Prioridade',
      align: 'center',
      headerSx: headerSxCenteredSort,
      accessor: (r) => r.priority || '',
      render: (inc) => {
        const priority = priorityConfig[inc.priority] || priorityConfig.P3;
        return (
          <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
            <Chip
              label={priority.label}
              size="small"
              sx={{
                height: 21,
                bgcolor: priority.bg,
                color: priority.color,
                fontWeight: 600,
                fontSize: '0.525rem',
                '& .MuiChip-label': { px: 0.75, lineHeight: 1.2, whiteSpace: 'nowrap' },
              }}
            />
          </Box>
        );
      },
    },
    {
      id: 'status',
      label: 'Status',
      align: 'center',
      headerSx: headerSxCenteredSort,
      accessor: (r) => r.status || '',
      render: (inc) => {
        const status = statusConfig[inc.status] || statusConfig.OPEN;
        return (
          <Box
            onClick={(e) => e.stopPropagation()}
            sx={{ display: 'flex', justifyContent: 'center', width: '100%' }}
          >
            {onStatusChange && canWrite ? (
              <InlineStatusSelect
                status={inc.status}
                statusConfig={statusConfig}
                dense
                onStatusChange={(newStatus) => onStatusChange(inc.id, newStatus)}
              />
            ) : (
              <Chip
                label={status.label}
                size="small"
                sx={{
                  height: 21,
                  bgcolor: status.bg,
                  color: status.color,
                  fontWeight: 500,
                  fontSize: '0.525rem',
                  '& .MuiChip-label': { px: 0.75, lineHeight: 1.2, whiteSpace: 'nowrap' },
                }}
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
      headerSx: headerSxCenteredSort,
      sortable: true,
      accessor: (r) => (r.slaBreached ? 1 : 0),
      cellSx: () => ({
        textAlign: 'center',
        verticalAlign: 'middle',
      }),
      render: (inc) => {
        const slaColor = getIncidentSlaColor(inc);
        const icon = inc.slaBreached ? (
          <Warning sx={{ color: '#ef4444', fontSize: '1.125rem', display: 'block' }} />
        ) : (
          <AccessTime sx={{ color: slaColor, fontSize: '1.125rem', display: 'block' }} />
        );
        return (
          <Box
            sx={{
              display: 'grid',
              placeItems: 'center',
              width: '100%',
              minWidth: 0,
            }}
          >
            <Tooltip title={inc.slaBreached ? 'SLA Estourado!' : 'Dentro do SLA'}>
              <Box component="span" sx={{ display: 'inline-flex', lineHeight: 0, mx: 'auto' }}>
                {icon}
              </Box>
            </Tooltip>
          </Box>
        );
      },
    },
    {
      id: 'assigneeName',
      label: 'Responsável',
      accessor: (r) => r.assignee?.name || '',
      render: (inc) =>
        inc.assignee ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Avatar sx={{ width: 18, height: 18, fontSize: '0.5rem', bgcolor: '#2563eb' }}>
              {inc.assignee.name?.[0]}
            </Avatar>
            <Typography sx={{ color: textPrimary, fontSize: '0.6rem' }}>{inc.assignee.name}</Typography>
          </Box>
        ) : (
          <Typography sx={{ color: textMuted, fontSize: '0.6rem', fontStyle: 'italic' }}>
            Não atribuído
          </Typography>
        ),
    },
    {
      id: 'createdAt',
      label: 'Criado em',
      align: 'center',
      headerSx: headerSxCenteredSort,
      accessor: (r) => r.createdAt,
      render: (inc) => (
        <Tooltip title={new Date(inc.createdAt).toLocaleString('pt-BR')}>
          <Typography sx={{ color: textSecondary, fontSize: '0.6rem', display: 'block', textAlign: 'center' }}>
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
      width: 90,
      minWidth: 90,
      render: (inc) => (
        <Box sx={{ display: 'flex', gap: 0.25, justifyContent: 'center' }} onClick={(e) => e.stopPropagation()}>
          <Tooltip title="Visualizar">
            <IconButton
              size="small"
              onClick={() => onView(inc)}
              sx={{ color: '#818cf8', padding: '4px', '&:hover': { bgcolor: 'rgba(129, 140, 248, 0.1)' } }}
            >
              <Visibility sx={{ fontSize: '1.125rem' }} />
            </IconButton>
          </Tooltip>
          {canWrite && inc.status !== 'CLOSED' && (
            <Tooltip title="Editar">
              <IconButton
                size="small"
                onClick={() => onEdit(inc)}
                sx={{ color: '#10b981', padding: '4px', '&:hover': { bgcolor: 'rgba(16, 185, 129, 0.1)' } }}
              >
                <Edit sx={{ fontSize: '1.125rem' }} />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      ),
    },
  ];
}
