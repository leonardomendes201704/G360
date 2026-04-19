import { Box, IconButton } from '@mui/material';

/**
 * @param {object} p
 * @param {string} p.textPrimary
 * @param {(type: 'edit'|'delete') => object} p.actionBtnStyle
 * @param {function(object): void} p.onEdit
 * @param {function(string): void} p.onDelete
 */
export function getDepartmentListColumns({ textPrimary, actionBtnStyle, onEdit, onDelete }) {
  return [
    {
      id: 'code',
      label: 'Código',
      width: '10%',
      minWidth: 72,
      sortable: true,
      accessor: (d) => d.code || '',
      render: (d) => (
        <Box
          component="span"
          sx={{
            color: textPrimary,
            fontSize: 'inherit',
            lineHeight: 'inherit',
            fontWeight: 500,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {d.code}
        </Box>
      ),
    },
    {
      id: 'name',
      label: 'Nome',
      width: '28%',
      minWidth: 120,
      sortable: true,
      accessor: (d) => d.name || '',
      render: (d) => d.name,
    },
    {
      id: 'director',
      label: 'Diretor',
      width: '22%',
      minWidth: 100,
      sortable: true,
      accessor: (d) => d.director?.name || '',
      render: (d) => (d.director?.name ? d.director.name : '-'),
    },
    {
      id: 'costCenters',
      label: 'CCs vinculados',
      align: 'right',
      headerSx: {
        textAlign: 'right',
        '& .MuiTableSortLabel-root': { justifyContent: 'flex-end', width: '100%' },
      },
      width: '9%',
      minWidth: 64,
      sortable: true,
      accessor: (d) => d._count?.costCenters ?? 0,
      render: (d) => (
        <Box component="span" sx={{ fontSize: 'inherit', fontVariantNumeric: 'tabular-nums' }}>
          {d._count?.costCenters ?? 0}
        </Box>
      ),
      cellSx: () => ({ textAlign: 'right' }),
    },
    {
      id: 'actions',
      label: 'Ações',
      sortable: false,
      align: 'right',
      width: '24%',
      minWidth: 100,
      headerSx: {
        textAlign: 'right',
        '& .MuiTableSortLabel-root': { justifyContent: 'flex-end', width: '100%' },
      },
      render: (d) => (
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
          <IconButton onClick={() => onEdit(d)} sx={actionBtnStyle('edit')} aria-label="Editar diretoria">
            <span className="material-icons-round" style={{ fontSize: '18px' }}>
              edit
            </span>
          </IconButton>
          <IconButton onClick={() => onDelete(d.id)} sx={actionBtnStyle('delete')} aria-label="Excluir diretoria">
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
