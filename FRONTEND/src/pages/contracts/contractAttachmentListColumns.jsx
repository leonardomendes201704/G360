import { format } from 'date-fns';
import { Box, IconButton, Typography } from '@mui/material';
import { Delete, Download } from '@mui/icons-material';

/**
 * @param {object} p
 * @param {boolean} p.canAttach
 * @param {function(string): void} p.onDeleteClick
 * @param {function(string): string} p.getFileURL
 */
export function getContractAttachmentListColumns({ canAttach, onDeleteClick, getFileURL }) {
  return [
    {
      id: 'fileName',
      label: 'Nome',
      width: '46%',
      minWidth: 0,
      sortable: true,
      accessor: (a) => a.fileName || '',
      render: (a) => (
        <Typography color="text.primary" fontWeight={500} fontSize="0.875rem" noWrap title={a.fileName}>
          {a.fileName}
        </Typography>
      ),
    },
    {
      id: 'createdAt',
      label: 'Data',
      width: '34%',
      minWidth: 0,
      sortable: true,
      accessor: (a) => new Date(a.createdAt || 0).getTime(),
      render: (a) => (
        <Typography color="text.secondary" fontSize="0.875rem">
          {format(new Date(a.createdAt), 'dd/MM/yyyy HH:mm')}
        </Typography>
      ),
    },
    {
      id: 'actions',
      label: 'Ações',
      width: '20%',
      minWidth: 0,
      sortable: false,
      align: 'right',
      render: (a) => (
        <Box sx={{ display: 'inline-flex', gap: 0 }}>
          <IconButton href={getFileURL(a.fileUrl)} target="_blank" rel="noopener noreferrer" color="primary" size="small">
            <Download />
          </IconButton>
          {canAttach && (
            <IconButton onClick={() => onDeleteClick(a.id)} color="error" size="small" aria-label="Excluir anexo">
              <Delete />
            </IconButton>
          )}
        </Box>
      ),
    },
  ];
}
