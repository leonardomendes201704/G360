import { Box, IconButton, Typography } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

/**
 * @param {object} p
 * @param {function(object): void} p.onEditCategory
 * @param {function(string): void} p.onDeleteCategory
 */
export function getCatalogCategoryListColumns({ onEditCategory, onDeleteCategory }) {
  return [
    {
      id: 'name',
      label: 'Nome da Categoria',
      width: '72%',
      minWidth: 0,
      sortable: true,
      accessor: (c) => c.name || '',
      render: (c) => (
        <Typography variant="body1" fontWeight={500}>
          {c.name}
        </Typography>
      ),
    },
    {
      id: 'actions',
      label: 'Ações',
      width: '28%',
      minWidth: 0,
      sortable: false,
      align: 'right',
      render: (c) => (
        <Box sx={{ display: 'inline-flex', gap: 0, justifyContent: 'flex-end' }}>
          <IconButton size="small" onClick={() => onEditCategory(c)}>
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" color="error" onClick={() => onDeleteCategory(c.id)}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      ),
    },
  ];
}
