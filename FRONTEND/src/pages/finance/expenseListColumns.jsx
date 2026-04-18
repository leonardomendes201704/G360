import { format } from 'date-fns';
import { Box, Typography, Tooltip, IconButton } from '@mui/material';
import { getFileURL } from '../../utils/urlUtils';

function getExpenseStatusLabel(status) {
  const s = (status || '').toUpperCase();
  const configs = {
    PREVISTO: { label: 'Previsto', bg: '#1c2632', color: '#94a3b8' },
    PENDENTE: { label: 'Pendente', bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' },
    AGUARDANDO_APROVACAO: { label: 'Aguardando Aprovação', bg: 'rgba(37, 99, 235, 0.15)', color: '#2563eb' },
    APROVADO: { label: 'Aprovado', bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981' },
    ATRASADO: { label: 'Atrasado', bg: 'rgba(244, 63, 95, 0.15)', color: '#f43f5e' },
    PAGO: { label: 'Pago', bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981' },
    CANCELADO: { label: 'Cancelado', bg: 'rgba(100, 116, 139, 0.15)', color: '#64748b' },
  };
  return configs[s] || configs.PREVISTO;
}

export function renderExpenseStatusBadge(status) {
  const c = getExpenseStatusLabel(status);
  return (
    <span style={{ padding: '5px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 600, background: c.bg, color: c.color }}>
      {c.label}
    </span>
  );
}

/**
 * @param {object} p
 * @param p.formatCurrency
 * @param p.textPrimary
 * @param p.textSecondary
 * @param p.borderColor
 * @param p.surfaceBg
 * @param p.actionBtnStyle
 * @param p.canSubmitForApprovalFlow
 * @param p.canApproveOrEditExpense
 * @param p.onOpenSubmit
 * @param p.onOpenApproval
 * @param p.onOpenEdit
 * @param p.onDelete
 */
export function getExpenseListColumns({
  formatCurrency,
  textPrimary,
  textSecondary,
  borderColor,
  surfaceBg,
  actionBtnStyle,
  canSubmitForApprovalFlow,
  canApproveOrEditExpense,
  onOpenSubmit,
  onOpenApproval,
  onOpenEdit,
  onDelete,
}) {
  return [
    {
      id: 'date',
      label: 'Data',
      width: '9%',
      minWidth: 0,
      sortable: true,
      accessor: (e) => new Date(e.date || 0).getTime(),
      render: (e) => (
        <Typography component="span" sx={{ color: textSecondary, fontSize: '13px' }}>{format(new Date(e.date), 'dd/MM/yyyy')}</Typography>
      ),
    },
    {
      id: 'description',
      label: 'Descrição',
      width: '20%',
      minWidth: 0,
      sortable: true,
      accessor: (e) => e.description || '',
      render: (e) => (
        <Box>
          <Typography sx={{ fontWeight: 500, color: textPrimary, fontSize: '13px' }}>{e.description}</Typography>
          {e.approvalStatus === 'UNPLANNED' && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
              <span className="material-icons-round" style={{ fontSize: '12px', color: '#f59e0b' }}>warning</span>
              <Typography sx={{ fontSize: '11px', color: '#f59e0b', fontWeight: 600 }}>Extra-Orçamentário</Typography>
            </Box>
          )}
          {e.invoiceNumber &&
            (e.fileUrl ? (
              <a href={getFileURL(e.fileUrl)} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }} onClick={(ev) => ev.stopPropagation()}>
                <Typography sx={{ fontSize: '11px', color: '#2563eb', cursor: 'pointer', mt: 0.5, display: 'block', '&:hover': { textDecoration: 'underline' } }}>
                  NF: {e.invoiceNumber}
                </Typography>
              </a>
            ) : (
              <Typography sx={{ fontSize: '11px', color: textSecondary, mt: 0.5 }}>NF: {e.invoiceNumber}</Typography>
            ))}
        </Box>
      ),
    },
    {
      id: 'supplier',
      label: 'Fornecedor',
      width: '12%',
      minWidth: 0,
      sortable: true,
      accessor: (e) => e.supplier?.name || '',
      render: (e) => <Typography sx={{ fontSize: '13px' }}>{e.supplier?.name || '-'}</Typography>,
    },
    {
      id: 'accountLine',
      label: 'Conta / Centro',
      width: '14%',
      minWidth: 0,
      sortable: true,
      render: (e) => (
        <Box>
          <Typography sx={{ fontSize: '12px', color: textPrimary }}>{e.costCenter?.code}</Typography>
          <Typography sx={{ fontSize: '11px', color: textSecondary }}>{e.account?.name}</Typography>
        </Box>
      ),
    },
    {
      id: 'dueDate',
      label: 'Vencimento',
      width: '9%',
      minWidth: 0,
      sortable: true,
      accessor: (e) => (e.dueDate ? new Date(e.dueDate).getTime() : 0),
      render: (e) => (
        <Typography component="span" sx={{ color: textSecondary, fontSize: '13px' }}>{e.dueDate ? format(new Date(e.dueDate), 'dd/MM/yyyy') : '-'}</Typography>
      ),
    },
    {
      id: 'status',
      label: 'Status',
      width: '10%',
      minWidth: 0,
      sortable: true,
      accessor: (e) => (e.status || '').toUpperCase(),
      render: (e) => renderExpenseStatusBadge(e.status),
    },
    {
      id: 'amount',
      label: 'Valor',
      width: '10%',
      minWidth: 0,
      sortable: true,
      align: 'right',
      accessor: (e) => Number(e.amount) || 0,
      render: (e) => <Typography sx={{ textAlign: 'right', fontWeight: 600, color: textPrimary, fontSize: '13px' }}>{formatCurrency(e.amount)}</Typography>,
    },
    {
      id: 'actions',
      label: 'Ações',
      sortable: false,
      width: '14%',
      minWidth: 0,
      align: 'right',
      render: (e) => {
        const s = (e.status || '').toUpperCase();
        return (
          <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }} onClick={(ev) => ev.stopPropagation()}>
            {s === 'PREVISTO' && canSubmitForApprovalFlow && (
              <Tooltip title="Enviar para Aprovação" arrow>
                <IconButton onClick={() => onOpenSubmit(e)} sx={actionBtnStyle('success')}>
                  <span className="material-icons-round" style={{ fontSize: '16px' }}>send</span>
                </IconButton>
              </Tooltip>
            )}
            {e.status === 'AGUARDANDO_APROVACAO' && canApproveOrEditExpense && (
              <Tooltip title="Aprovar e anexar NF" arrow>
                <IconButton onClick={() => onOpenApproval(e)} sx={actionBtnStyle('success')}>
                  <span className="material-icons-round" style={{ fontSize: '16px' }}>check_circle</span>
                </IconButton>
              </Tooltip>
            )}
            {s === 'PREVISTO' && canApproveOrEditExpense && (
              <Tooltip title="Editar" arrow>
                <IconButton onClick={() => onOpenEdit(e)} sx={actionBtnStyle('edit')}>
                  <span className="material-icons-round" style={{ fontSize: '16px' }}>edit</span>
                </IconButton>
              </Tooltip>
            )}
            {!['APROVADO', 'PAGO', 'AGUARDANDO_APROVACAO'].includes(s) && (
              <Tooltip title="Excluir" arrow>
                <IconButton onClick={() => onDelete(e)} sx={actionBtnStyle('delete')}>
                  <span className="material-icons-round" style={{ fontSize: '16px' }}>delete</span>
                </IconButton>
              </Tooltip>
            )}
          </Box>
        );
      },
    },
  ];
}
