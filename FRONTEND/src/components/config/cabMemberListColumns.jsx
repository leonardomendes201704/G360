import { Box, IconButton } from '@mui/material';

/**
 * @param {object} p
 * @param {string} p.textPrimary
 * @param {(type: 'edit'|'delete') => object} p.actionBtnStyle
 * @param {function(object): void} p.onRemove
 */
export function getCabMemberListColumns({ textPrimary, actionBtnStyle, onRemove }) {
  return [
    {
      id: 'name',
      label: 'Membro',
      width: '24%',
      minWidth: 140,
      sortable: true,
      accessor: (u) => u.name || '',
      render: (u) => (
        <Box component="span" sx={{ color: textPrimary, fontSize: 'inherit', fontWeight: 500 }}>
          {u.name}
        </Box>
      ),
    },
    {
      id: 'roleName',
      label: 'Cargo',
      width: '20%',
      minWidth: 120,
      sortable: true,
      accessor: (u) => u.roles?.find((r) => r.name !== 'CAB Member')?.name || 'Membro',
      render: (u) => u.roles?.find((r) => r.name !== 'CAB Member')?.name || 'Membro',
    },
    {
      id: 'department',
      label: 'Diretoria',
      width: '18%',
      minWidth: 100,
      sortable: true,
      accessor: (u) => u.department?.name || '',
      render: (u) => u.department?.name || '-',
    },
    {
      id: 'email',
      label: 'E-mail',
      width: '26%',
      minWidth: 160,
      sortable: true,
      accessor: (u) => u.email || '',
      render: (u) => u.email,
    },
    {
      id: 'actions',
      label: 'Ações',
      sortable: false,
      align: 'right',
      width: '12%',
      minWidth: 72,
      headerSx: {
        textAlign: 'right',
        '& .MuiTableSortLabel-root': { justifyContent: 'flex-end', width: '100%' },
      },
      render: (u) => (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <IconButton onClick={() => onRemove(u)} sx={actionBtnStyle('delete')} title="Remover do CAB" aria-label="Remover do CAB">
            <span className="material-icons-round" style={{ fontSize: '18px' }}>
              remove_circle
            </span>
          </IconButton>
        </Box>
      ),
      cellSx: () => ({ textAlign: 'right', overflow: 'visible' }),
    },
  ];
}
