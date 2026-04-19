import { Box, Avatar, Typography, Chip, Switch, IconButton } from '@mui/material';
import { Edit, Delete, Security } from '@mui/icons-material';

const getAvatarUrl = (name) => `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;

/**
 * @param {object} p
 * @param {function(object): void} p.onEdit
 * @param {function(string): void} p.onDelete
 * @param {function(object): void} p.onToggleStatus
 */
export function getUserListColumns({ onEdit, onDelete, onToggleStatus }) {
  return [
    {
      id: 'user',
      label: 'Usuário',
      width: '26%',
      minWidth: 200,
      sortable: true,
      accessor: (u) => u.name || '',
      verticalAlign: 'middle',
      render: (u) => (
        <Box display="flex" alignItems="center" gap={1.5}>
          <Avatar
            src={u.avatar || getAvatarUrl(u.name)}
            alt={u.name}
            sx={{ width: 32, height: 32, fontSize: '0.75rem' }}
          />
          <Box sx={{ minWidth: 0 }}>
            <Box component="span" sx={{ fontSize: 'inherit', lineHeight: 1.3, display: 'block' }}>
              {u.name}
            </Box>
            {u.azureId && (
              <Typography
                variant="caption"
                color="primary"
                sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '0.65rem', mt: 0.25 }}
              >
                <Security sx={{ fontSize: '0.75rem' }} /> Azure AD
              </Typography>
            )}
          </Box>
        </Box>
      ),
    },
    {
      id: 'email',
      label: 'E-mail',
      width: '22%',
      minWidth: 160,
      sortable: true,
      accessor: (u) => u.email || '',
      verticalAlign: 'middle',
      render: (u) => u.email,
    },
    {
      id: 'roles',
      label: 'Perfil',
      width: '22%',
      minWidth: 140,
      sortable: true,
      accessor: (u) =>
        u.roles?.length
          ? u.roles
              .map((r) => r.name)
              .sort()
              .join(', ')
          : u.role?.name || '',
      verticalAlign: 'middle',
      render: (u) =>
        u.roles && u.roles.length > 0 ? (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {u.roles.map((role) => (
              <Chip
                key={role.id}
                icon={<Security sx={{ fontSize: '0.875rem !important' }} />}
                label={role.name}
                size="small"
                variant="outlined"
                color="primary"
              />
            ))}
          </Box>
        ) : u.role ? (
          <Chip
            icon={<Security sx={{ fontSize: '0.875rem !important' }} />}
            label={u.role.name}
            size="small"
            variant="outlined"
            color="primary"
          />
        ) : (
          <Box component="span" sx={{ fontSize: 'inherit', color: 'text.disabled', fontStyle: 'italic' }}>
            Sem perfil
          </Box>
        ),
    },
    {
      id: 'costCenter',
      label: 'Departamento',
      width: '14%',
      minWidth: 100,
      sortable: true,
      accessor: (u) => u.costCenter?.name || '',
      verticalAlign: 'middle',
      render: (u) => (u.costCenter ? u.costCenter.name : '-'),
    },
    {
      id: 'isActive',
      label: 'Status',
      width: '10%',
      minWidth: 120,
      sortable: true,
      accessor: (u) => (u.isActive ? 1 : 0),
      verticalAlign: 'middle',
      render: (u) => (
        <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.5 }}>
          <Switch checked={u.isActive} onChange={() => onToggleStatus(u)} color="success" size="small" />
          <Box component="span" sx={{ fontSize: 'inherit', whiteSpace: 'nowrap' }}>
            {u.isActive ? 'Ativo' : 'Inativo'}
          </Box>
        </Box>
      ),
    },
    {
      id: 'actions',
      label: 'Ações',
      sortable: false,
      align: 'right',
      width: '10%',
      minWidth: 88,
      headerSx: {
        textAlign: 'right',
        '& .MuiTableSortLabel-root': { justifyContent: 'flex-end', width: '100%' },
      },
      verticalAlign: 'middle',
      render: (u) => (
        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
          <IconButton size="small" onClick={() => onEdit(u)} aria-label="Editar usuário">
            <Edit fontSize="small" />
          </IconButton>
          <IconButton size="small" color="error" onClick={() => onDelete(u.id)} aria-label="Excluir usuário">
            <Delete fontSize="small" />
          </IconButton>
        </Box>
      ),
      cellSx: () => ({ textAlign: 'right', overflow: 'visible' }),
    },
  ];
}
