import { Box, IconButton, Chip } from '@mui/material';
import { Edit, Delete, Security } from '@mui/icons-material';

/**
 * @param {object} p
 * @param {function(object): void} p.onEdit
 * @param {function(string): void} p.onDelete
 */
export function getRoleListColumns({ onEdit, onDelete }) {
  return [
    {
      id: 'name',
      label: 'Nome',
      width: '28%',
      minWidth: 140,
      sortable: true,
      accessor: (r) => r.name || '',
      verticalAlign: 'middle',
      render: (role) => (
        <Box display="flex" alignItems="center" gap={1} sx={{ fontSize: 'inherit' }}>
          <Security color="action" sx={{ fontSize: '1rem', flexShrink: 0 }} />
          {role.name}
        </Box>
      ),
    },
    {
      id: 'description',
      label: 'Descrição',
      width: '36%',
      minWidth: 160,
      sortable: true,
      accessor: (r) => r.description || '',
      verticalAlign: 'middle',
      render: (role) => role.description || '-',
    },
    {
      id: 'permissions',
      label: 'Permissões',
      width: '22%',
      minWidth: 120,
      sortable: true,
      accessor: (r) => r.permissions?.length ?? 0,
      verticalAlign: 'middle',
      render: (role) => (
        <Chip
          label={`${role.permissions ? role.permissions.length : 0} Regras`}
          size="small"
          variant="outlined"
        />
      ),
    },
    {
      id: 'actions',
      label: 'Ações',
      sortable: false,
      align: 'right',
      width: '14%',
      minWidth: 88,
      headerSx: {
        textAlign: 'right',
        '& .MuiTableSortLabel-root': { justifyContent: 'flex-end', width: '100%' },
      },
      verticalAlign: 'middle',
      render: (role) => (
        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
          <IconButton size="small" onClick={() => onEdit(role)} aria-label="Editar perfil">
            <Edit fontSize="small" />
          </IconButton>
          <IconButton size="small" color="error" onClick={() => onDelete(role.id)} aria-label="Excluir perfil">
            <Delete fontSize="small" />
          </IconButton>
        </Box>
      ),
      cellSx: () => ({ textAlign: 'right', overflow: 'visible' }),
    },
  ];
}
