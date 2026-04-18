import { Box, Typography, Chip, IconButton } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';

const STATUS_COLORS = {
  INVESTIGATING: 'secondary',
  IDENTIFIED: 'warning',
  WORKAROUND: 'info',
  RESOLVED: 'success',
  CLOSED: 'default',
};

/**
 * Colunas DataListTable — gestão de problemas ITIL.
 */
export function getProblemColumns({ onManage }) {
  return [
    {
      id: 'code',
      label: 'Código',
      width: '12%',
      minWidth: 110,
      accessor: (r) => r.code || '',
      render: (p) => (
        <Typography component="span" fontWeight={700}>
          {p.code}
        </Typography>
      ),
    },
    {
      id: 'titleAndCause',
      label: 'Título & Causa',
      accessor: (r) => r.title || '',
      cellSx: () => ({
        maxWidth: 360,
        overflow: 'hidden',
      }),
      render: (p) => (
        <Box>
          <Typography variant="body2" fontWeight="bold">
            {p.title}
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block">
            {p.rootCause ? `Causa: ${p.rootCause.substring(0, 50)}...` : 'Causa em Investigação'}
          </Typography>
        </Box>
      ),
    },
    {
      id: 'incidentCount',
      label: 'Incidentes atrelados',
      align: 'center',
      accessor: (r) => r.incidents?.length ?? 0,
      render: (p) => <Chip label={p.incidents?.length || 0} size="small" />,
    },
    {
      id: 'status',
      label: 'Status',
      accessor: (r) => r.status || '',
      render: (p) => (
        <Chip
          label={p.status}
          size="small"
          color={STATUS_COLORS[p.status] || 'default'}
          variant="outlined"
        />
      ),
    },
    {
      id: 'actions',
      label: 'Gerenciar',
      align: 'right',
      sortable: false,
      width: 100,
      minWidth: 88,
      render: (p) => (
        <IconButton
          size="small"
          color="primary"
          aria-label="Gerenciar problema"
          onClick={(e) => {
            e.stopPropagation();
            onManage(p);
          }}
        >
          <EditIcon />
        </IconButton>
      ),
    },
  ];
}
