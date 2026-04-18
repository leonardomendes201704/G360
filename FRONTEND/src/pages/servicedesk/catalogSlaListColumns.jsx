import { Box, IconButton, Typography } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

function formatHours(minutes) {
  return `${Math.round(minutes / 60)}h`;
}

/**
 * @param {object} p
 * @param {function(string): void} p.onDeleteSla
 */
export function getCatalogSlaListColumns({ onDeleteSla }) {
  return [
    {
      id: 'name',
      label: 'Nome da Política',
      width: '42%',
      minWidth: 0,
      sortable: true,
      accessor: (sla) => sla.name || '',
      cellSx: () => ({ verticalAlign: 'top' }),
      render: (sla) => (
        <Box>
          <Typography variant="body1" fontWeight="bold" color="secondary.main">
            {sla.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {sla.description || 'SLA Global de Sistema'}
          </Typography>
        </Box>
      ),
    },
    {
      id: 'deadlines',
      label: 'Prazos Fixados (Resposta / Solução)',
      width: '38%',
      minWidth: 0,
      sortable: true,
      accessor: (sla) => Number(sla.resolveMinutes ?? 0),
      cellSx: () => ({ verticalAlign: 'top' }),
      render: (sla) => (
        <Box>
          <Typography variant="body2" sx={{ mb: 0.5 }}>
            1ª Resposta em MÁX: <b>{formatHours(sla.responseMinutes)}</b>
          </Typography>
          <Typography variant="body2">
            Solução em MÁX: <b>{formatHours(sla.resolveMinutes)}</b>
          </Typography>
        </Box>
      ),
    },
    {
      id: 'actions',
      label: 'Ações',
      width: '20%',
      minWidth: 0,
      sortable: false,
      align: 'right',
      cellSx: () => ({ verticalAlign: 'top' }),
      render: (sla) => (
        <IconButton size="small" color="error" onClick={() => onDeleteSla(sla.id)}>
          <DeleteIcon fontSize="small" />
        </IconButton>
      ),
    },
  ];
}
