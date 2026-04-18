import { Box, Typography, IconButton } from '@mui/material';

const BUDGET_STATUS = {
  DRAFT: { label: 'Rascunho', bg: 'action.hover', color: 'text.secondary' },
  APPROVED: { label: 'Aprovado', bg: 'rgba(37, 99, 235, 0.15)', color: 'primary.main' },
  REJECTED: { label: 'Rejeitado', bg: 'rgba(244, 63, 94, 0.15)', color: 'error.main' },
  CLOSED: { label: 'Fechado', bg: 'action.disabledBackground', color: 'text.disabled' },
};

function renderBudgetStatus(status) {
  const c = BUDGET_STATUS[status] || BUDGET_STATUS.DRAFT;
  return (
    <Box
      component="span"
      sx={{ px: 1.5, py: 0.5, borderRadius: '8px', fontSize: '12px', fontWeight: 600, bgcolor: c.bg, color: c.color, display: 'inline-block' }}
    >
      {c.label}
    </Box>
  );
}

/**
 * Colunas DataListTable — orçamentos (FinancePage).
 */
export function getBudgetListColumns({ formatCurrency, onDuplicate, onOpenDetails, onEdit, onDelete, canEditBudget = true }) {
  return [
    {
      id: 'name',
      label: 'Nome',
      width: '24%',
      minWidth: 0,
      sortable: true,
      accessor: (r) => r.name || '',
      render: (b) => (
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', display: 'inline' }}>
            {b.name}
          </Typography>
          {b.isOBZ && (
            <Box
              component="span"
              sx={{ ml: 1, px: 0.75, py: 0.25, borderRadius: '8px', fontSize: '10px', fontWeight: 600, bgcolor: 'rgba(37, 99, 235, 0.15)', color: 'primary.main' }}
            >
              OBZ
            </Box>
          )}
        </Box>
      ),
    },
    {
      id: 'fiscalYear',
      label: 'Ano',
      width: '9%',
      minWidth: 0,
      sortable: true,
      accessor: (r) => r.fiscalYear?.year || 0,
      render: (b) => <Box sx={{ color: 'text.secondary' }}>{b.fiscalYear?.year || '-'}</Box>,
    },
    {
      id: 'status',
      label: 'Status',
      width: '12%',
      minWidth: 0,
      sortable: true,
      accessor: (r) => r.status || '',
      render: (b) => renderBudgetStatus(b.status),
    },
    {
      id: 'totalOpex',
      label: 'Total',
      width: '12%',
      minWidth: 0,
      sortable: true,
      align: 'right',
      accessor: (r) => Number(r.totalOpex) || 0,
      render: (b) => (
        <Box sx={{ color: 'primary.main', fontWeight: 600, textAlign: 'right' }}>{formatCurrency(b.totalOpex)}</Box>
      ),
    },
    {
      id: 'actions',
      label: 'Ações',
      sortable: false,
      width: '20%',
      minWidth: 0,
      align: 'right',
      render: (b) => (
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }} onClick={(e) => e.stopPropagation()}>
          <IconButton onClick={() => onDuplicate(b)} size="small" sx={{ color: 'primary.light' }} title="Duplicar">
            <span className="material-icons-round" style={{ fontSize: '18px' }}>content_copy</span>
          </IconButton>
          <IconButton onClick={() => onOpenDetails(b)} size="small" sx={{ color: 'text.secondary' }} title="Visualizar">
            <span className="material-icons-round" style={{ fontSize: '18px' }}>visibility</span>
          </IconButton>
          <IconButton onClick={() => onEdit(b)} size="small" sx={{ color: 'primary.main' }} title="Editar" disabled={b.status === 'APPROVED' || !canEditBudget}>
            <span className="material-icons-round" style={{ fontSize: '18px' }}>edit</span>
          </IconButton>
          <IconButton onClick={() => onDelete(b.id)} size="small" sx={{ color: 'error.main' }} title="Excluir" disabled={b.status === 'APPROVED' || !canEditBudget}>
            <span className="material-icons-round" style={{ fontSize: '18px' }}>delete</span>
          </IconButton>
        </Box>
      ),
    },
  ];
}
