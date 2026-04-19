import { Box, IconButton } from '@mui/material';

function formatDateUTC(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  const userTimezoneOffset = date.getTimezoneOffset() * 60000;
  const adjustedDate = new Date(date.getTime() + userTimezoneOffset);
  return adjustedDate.toLocaleDateString('pt-BR');
}

/**
 * @param {object} p
 * @param {string} p.textPrimary
 * @param {(type: 'edit'|'delete') => object} p.actionBtnStyle
 * @param {function(object): void} p.onEdit
 * @param {function(string): void} p.onDelete
 */
export function getFiscalYearListColumns({ textPrimary, actionBtnStyle, onEdit, onDelete }) {
  return [
    {
      id: 'year',
      label: 'Ano',
      width: '12%',
      minWidth: 72,
      sortable: true,
      accessor: (fy) => Number(fy.year) || 0,
      render: (fy) => (
        <Box component="span" sx={{ color: textPrimary, fontSize: 'inherit', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
          {fy.year}
        </Box>
      ),
    },
    {
      id: 'startDate',
      label: 'Início',
      width: '18%',
      minWidth: 96,
      sortable: true,
      accessor: (fy) => fy.startDate || '',
      render: (fy) => formatDateUTC(fy.startDate),
    },
    {
      id: 'endDate',
      label: 'Fim',
      width: '18%',
      minWidth: 96,
      sortable: true,
      accessor: (fy) => fy.endDate || '',
      render: (fy) => formatDateUTC(fy.endDate),
    },
    {
      id: 'isClosed',
      label: 'Status',
      width: '14%',
      minWidth: 96,
      sortable: true,
      accessor: (fy) => (fy.isClosed ? 1 : 0),
      render: (fy) => (
        <Box
          component="span"
          sx={{
            display: 'inline-block',
            px: 1.5,
            py: 0.75,
            borderRadius: '8px',
            fontSize: 'inherit',
            lineHeight: 1.2,
            fontWeight: 600,
            background: fy.isClosed ? 'rgba(100, 116, 139, 0.15)' : 'rgba(16, 185, 129, 0.15)',
            color: fy.isClosed ? '#64748b' : '#10b981',
          }}
        >
          {fy.isClosed ? 'Fechado' : 'Aberto'}
        </Box>
      ),
    },
    {
      id: 'actions',
      label: 'Ações',
      sortable: false,
      align: 'right',
      width: '18%',
      minWidth: 88,
      headerSx: {
        textAlign: 'right',
        '& .MuiTableSortLabel-root': { justifyContent: 'flex-end', width: '100%' },
      },
      render: (fy) => (
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
          <IconButton onClick={() => onEdit(fy)} sx={actionBtnStyle('edit')} aria-label="Editar ano fiscal">
            <span className="material-icons-round" style={{ fontSize: '18px' }}>
              edit
            </span>
          </IconButton>
          <IconButton onClick={() => onDelete(fy.id)} sx={actionBtnStyle('delete')} aria-label="Excluir ano fiscal">
            <span className="material-icons-round" style={{ fontSize: '18px' }}>
              delete
            </span>
          </IconButton>
        </Box>
      ),
      cellSx: () => ({ textAlign: 'right', overflow: 'visible' }),
    },
  ];
}
