import { Box, IconButton } from '@mui/material';

function formatCurrency(v) {
  return v
    ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
    : '-';
}

/**
 * @param {object} p
 * @param {string} p.textPrimary
 * @param {(type: 'edit'|'delete') => object} p.actionBtnStyle
 * @param {function(object): void} p.onEdit
 * @param {function(string): void} p.onDelete
 */
export function getCostCenterListColumns({ textPrimary, actionBtnStyle, onEdit, onDelete }) {
  return [
    {
      id: 'code',
      label: 'Código',
      width: '10%',
      minWidth: 72,
      sortable: true,
      accessor: (cc) => cc.code || '',
      render: (cc) => (
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
          {cc.code}
        </Box>
      ),
    },
    {
      id: 'name',
      label: 'Nome',
      width: '22%',
      minWidth: 120,
      sortable: true,
      accessor: (cc) => cc.name || '',
      render: (cc) => cc.name,
    },
    {
      id: 'department',
      label: 'Diretoria',
      width: '18%',
      minWidth: 100,
      sortable: true,
      accessor: (cc) => cc.department?.name || '',
      render: (cc) => cc.department?.name || '-',
    },
    {
      id: 'manager',
      label: 'Gestor responsável',
      width: '18%',
      minWidth: 100,
      sortable: true,
      accessor: (cc) => cc.manager?.name || '',
      render: (cc) => cc.manager?.name || '-',
    },
    {
      id: 'annualBudget',
      label: 'Orçamento anual',
      width: '14%',
      minWidth: 96,
      sortable: true,
      align: 'right',
      headerSx: {
        textAlign: 'right',
        '& .MuiTableSortLabel-root': { justifyContent: 'flex-end', width: '100%' },
      },
      accessor: (cc) => Number(cc.annualBudget) || 0,
      render: (cc) => (
        <Box component="span" sx={{ fontSize: 'inherit', fontVariantNumeric: 'tabular-nums' }}>
          {formatCurrency(cc.annualBudget)}
        </Box>
      ),
      cellSx: () => ({ textAlign: 'right' }),
    },
    {
      id: 'isActive',
      label: 'Status',
      width: '10%',
      minWidth: 88,
      sortable: true,
      accessor: (cc) => (cc.isActive ? 1 : 0),
      render: (cc) => (
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
            background: cc.isActive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(100, 116, 139, 0.15)',
            color: cc.isActive ? '#10b981' : '#64748b',
          }}
        >
          {cc.isActive ? 'Ativo' : 'Inativo'}
        </Box>
      ),
    },
    {
      id: 'actions',
      label: 'Ações',
      sortable: false,
      align: 'right',
      width: '12%',
      minWidth: 88,
      headerSx: {
        textAlign: 'right',
        '& .MuiTableSortLabel-root': { justifyContent: 'flex-end', width: '100%' },
      },
      render: (cc) => (
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
          <IconButton onClick={() => onEdit(cc)} sx={actionBtnStyle('edit')} aria-label="Editar centro de custo">
            <span className="material-icons-round" style={{ fontSize: '18px' }}>
              edit
            </span>
          </IconButton>
          <IconButton onClick={() => onDelete(cc.id)} sx={actionBtnStyle('delete')} aria-label="Excluir centro de custo">
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
