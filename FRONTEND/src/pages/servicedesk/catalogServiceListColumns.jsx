import { Box, Chip, IconButton, Typography } from '@mui/material';
import DynamicFormIcon from '@mui/icons-material/DynamicForm';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

/**
 * @param {object} p
 * @param {function(object): void} p.onOpenFormBuilder
 * @param {function(object): void} p.onEditService
 * @param {function(string): void} p.onDeleteService
 */
export function getCatalogServiceListColumns({ onOpenFormBuilder, onEditService, onDeleteService }) {
  return [
    {
      id: 'name',
      label: 'Serviço e Descrição',
      width: '38%',
      minWidth: 0,
      sortable: true,
      accessor: (s) => s.name || '',
      cellSx: () => ({ verticalAlign: 'top' }),
      render: (s) => (
        <Box>
          <Typography variant="body1" fontWeight={600} color="primary.main">
            {s.name}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {s.description}
          </Typography>
        </Box>
      ),
    },
    {
      id: 'category',
      label: 'Categoria',
      width: '18%',
      minWidth: 0,
      sortable: true,
      accessor: (s) => s.category?.name || '',
      cellSx: () => ({ verticalAlign: 'top' }),
      render: (s) => <Chip size="small" label={s.category?.name || 'Sem Categoria'} variant="outlined" />,
    },
    {
      id: 'sla',
      label: 'Política de SLA',
      width: '22%',
      minWidth: 0,
      sortable: true,
      accessor: (s) => s.slaPolicy?.name || '',
      cellSx: () => ({ verticalAlign: 'top' }),
      render: (s) =>
        s.slaPolicy ? (
          <Chip size="small" label={s.slaPolicy.name} color="success" />
        ) : (
          <Chip size="small" label="Sem SLA (Best-effort)" />
        ),
    },
    {
      id: 'actions',
      label: 'Ações Administrativas',
      width: '22%',
      minWidth: 0,
      sortable: false,
      align: 'right',
      cellSx: () => ({ verticalAlign: 'top' }),
      render: (s) => (
        <Box sx={{ display: 'inline-flex', gap: 0, justifyContent: 'flex-end' }}>
          <IconButton
            size="small"
            color="primary"
            onClick={() => onOpenFormBuilder(s)}
            title="Construir Formulário Dinâmico"
          >
            <DynamicFormIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={() => onEditService(s)}>
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" color="error" onClick={() => onDeleteService(s.id)}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      ),
    },
  ];
}
