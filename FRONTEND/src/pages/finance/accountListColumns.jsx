import { Box, IconButton, Typography } from '@mui/material';

/**
 * @param {object} p
 * @param {function} p.getTypeBadge — (type: string) => ReactNode
 * @param {function} p.onEdit
 * @param {function} p.onDelete
 * @param {boolean} p.canEdit
 */
export function getAccountListColumns({ getTypeBadge, onEdit, onDelete, canEdit = true }) {
  return [
    {
      id: 'code',
      label: 'Código',
      width: '12%',
      minWidth: 0,
      sortable: true,
      accessor: (r) => r.code || '',
      cellSx: () => ({ fontFamily: 'monospace' }),
      render: (a) => <Box sx={{ fontFamily: 'monospace', color: 'text.primary' }}>{a.code}</Box>,
    },
    {
      id: 'name',
      label: 'Nome',
      width: '28%',
      minWidth: 0,
      sortable: true,
      accessor: (r) => r.name || '',
      render: (a) => <Typography color="text.primary">{a.name}</Typography>,
    },
    {
      id: 'type',
      label: 'Tipo',
      width: '10%',
      minWidth: 0,
      sortable: true,
      accessor: (r) => r.type || '',
      render: (a) => getTypeBadge(a.type),
    },
    {
      id: 'hierarchy',
      label: 'Hierarquia',
      width: '22%',
      minWidth: 0,
      sortable: true,
      accessor: (a) => (a.parent ? `Sub de: ${a.parent.name}` : 'Raiz'),
      render: (a) => <Box sx={{ color: 'text.secondary' }}>{a.parent ? `Sub de: ${a.parent.name}` : 'Raiz'}</Box>,
    },
    {
      id: 'actions',
      label: 'Ações',
      sortable: false,
      width: '12%',
      minWidth: 0,
      align: 'right',
      render: (a) => (
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }} onClick={(e) => e.stopPropagation()}>
          <IconButton onClick={() => onEdit(a)} size="small" sx={{ color: 'primary.main' }} title="Editar" disabled={!canEdit}>
            <span className="material-icons-round" style={{ fontSize: '18px' }}>edit</span>
          </IconButton>
          <IconButton onClick={() => onDelete(a.id)} size="small" sx={{ color: 'error.main' }} title="Excluir" disabled={!canEdit}>
            <span className="material-icons-round" style={{ fontSize: '18px' }}>delete</span>
          </IconButton>
        </Box>
      ),
    },
  ];
}
