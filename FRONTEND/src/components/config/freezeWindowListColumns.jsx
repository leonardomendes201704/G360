import { Box, IconButton } from '@mui/material';
import { getFreezeWindowStatus } from './freezeWindowListSort';

/**
 * @param {object} p
 * @param {string} p.textPrimary
 * @param {(type: 'edit'|'delete') => object} p.actionBtnStyle
 * @param {function(object): void} p.onOpen
 * @param {function(string): void} p.onDelete
 */
export function getFreezeWindowListColumns({ textPrimary, actionBtnStyle, onOpen, onDelete }) {
  const getStatus = getFreezeWindowStatus;
  return [
    {
      id: 'name',
      label: 'Nome',
      width: '20%',
      minWidth: 120,
      sortable: true,
      accessor: (w) => w.name || '',
      render: (w) => (
        <Box component="span" sx={{ color: textPrimary, fontSize: 'inherit', fontWeight: 500 }}>
          {w.name}
        </Box>
      ),
    },
    {
      id: 'period',
      label: 'Período',
      width: '22%',
      minWidth: 160,
      sortable: true,
      accessor: (w) => w.startDate || '',
      render: (w) => (
        <Box component="span" sx={{ fontSize: 'inherit', whiteSpace: 'nowrap' }}>
          {new Date(w.startDate).toLocaleDateString('pt-BR')} – {new Date(w.endDate).toLocaleDateString('pt-BR')}
        </Box>
      ),
    },
    {
      id: 'description',
      label: 'Módulos afetados',
      width: '28%',
      minWidth: 140,
      sortable: true,
      accessor: (w) => w.description || '',
      render: (w) => w.description || 'GMUD, Contratos',
    },
    {
      id: 'statusLabel',
      label: 'Status',
      width: '14%',
      minWidth: 96,
      sortable: true,
      render: (w) => {
        const status = getStatus(w);
        return (
          <Box component="span" sx={{ color: status.color, fontWeight: 500, fontSize: 'inherit' }}>
            {status.label}
          </Box>
        );
      },
    },
    {
      id: 'actions',
      label: 'Ações',
      sortable: false,
      align: 'right',
      width: '16%',
      minWidth: 88,
      headerSx: {
        textAlign: 'right',
        '& .MuiTableSortLabel-root': { justifyContent: 'flex-end', width: '100%' },
      },
      render: (w) => {
        const status = getStatus(w);
        const icon = status.label === 'Finalizado' ? 'visibility' : 'edit';
        return (
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
            <IconButton onClick={() => onOpen(w)} sx={actionBtnStyle('edit')} aria-label="Abrir janela">
              <span className="material-icons-round" style={{ fontSize: '18px' }}>
                {icon}
              </span>
            </IconButton>
            <IconButton onClick={() => onDelete(w.id)} sx={actionBtnStyle('delete')} aria-label="Excluir janela">
              <span className="material-icons-round" style={{ fontSize: '18px' }}>
                delete
              </span>
            </IconButton>
          </Box>
        );
      },
      cellSx: () => ({ textAlign: 'right', overflow: 'visible' }),
    },
  ];
}
