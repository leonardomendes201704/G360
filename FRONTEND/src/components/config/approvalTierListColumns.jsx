import { Box, IconButton } from '@mui/material';
import { approvalTierEntityLabel, approvalTierExpensePlanScopeLabel } from './approvalTierConstants';

function formatMoney(v) {
  if (v == null || v === '') return '—';
  const n = Number(v);
  if (Number.isNaN(n)) return '—';
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/**
 * @param {object} p
 * @param {string} p.textPrimary
 * @param {(type: 'edit'|'delete') => object} p.actionBtnStyle
 * @param {function(object): void} p.onEdit
 * @param {function(string): void} p.onDelete
 */
export function getApprovalTierListColumns({ textPrimary, actionBtnStyle, onEdit, onDelete }) {
  return [
    {
      id: 'name',
      label: 'Nome',
      width: '16%',
      minWidth: 100,
      sortable: true,
      accessor: (row) => row.name || '',
      render: (row) => (
        <Box component="span" sx={{ color: textPrimary, fontSize: 'inherit', fontWeight: 500 }}>
          {row.name}
        </Box>
      ),
    },
    {
      id: 'entityType',
      label: 'Tipo',
      width: '18%',
      minWidth: 140,
      sortable: true,
      accessor: (row) => row.entityType || '',
      render: (row) => approvalTierEntityLabel(row.entityType),
    },
    {
      id: 'expensePlanScope',
      label: 'Âmbito despesa',
      width: '14%',
      minWidth: 120,
      sortable: true,
      accessor: (row) => (row.entityType === 'EXPENSE' ? approvalTierExpensePlanScopeLabel(row.expensePlanScope) : ''),
      render: (row) =>
        row.entityType === 'EXPENSE' ? approvalTierExpensePlanScopeLabel(row.expensePlanScope) : '—',
    },
    {
      id: 'role',
      label: 'Perfil',
      width: '14%',
      minWidth: 100,
      sortable: true,
      accessor: (row) => row.role?.name || '',
      render: (row) => row.role?.name || '—',
    },
    {
      id: 'range',
      label: 'Faixa (R$)',
      width: '18%',
      minWidth: 140,
      sortable: true,
      accessor: (row) => Number(row.minAmount) || 0,
      render: (row) => (
        <Box component="span" sx={{ fontSize: 'inherit', whiteSpace: 'nowrap' }}>
          {formatMoney(row.minAmount)} → {formatMoney(row.maxAmount)}
        </Box>
      ),
    },
    {
      id: 'globalScope',
      label: 'Escopo',
      width: '16%',
      minWidth: 120,
      sortable: true,
      accessor: (row) => (row.globalScope ? 1 : 0),
      render: (row) => (row.globalScope ? 'Global (empresa)' : 'Só recursos geridos'),
    },
    {
      id: 'isActive',
      label: 'Ativa',
      width: '8%',
      minWidth: 64,
      sortable: true,
      accessor: (row) => (row.isActive ? 1 : 0),
      render: (row) => (row.isActive ? 'Sim' : 'Não'),
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
      render: (row) => (
        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
          <IconButton size="small" onClick={() => onEdit(row)} sx={actionBtnStyle('edit')} aria-label="Editar alçada">
            <span className="material-icons-round" style={{ fontSize: '16px' }}>
              edit
            </span>
          </IconButton>
          <IconButton size="small" onClick={() => onDelete(row.id)} sx={{ ...actionBtnStyle('delete'), ml: 0.5 }} aria-label="Excluir alçada">
            <span className="material-icons-round" style={{ fontSize: '16px' }}>
              delete
            </span>
          </IconButton>
        </Box>
      ),
      cellSx: () => ({ textAlign: 'right', overflow: 'visible' }),
    },
  ];
}
