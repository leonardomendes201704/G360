import { format } from 'date-fns';
import { Box, IconButton, Tooltip, Typography } from '@mui/material';
import { getContractStatus, getContractStatusStyle } from './contractListUtils';

/**
 * @param {object} p
 * @param {function} p.formatCurrency
 * @param {function} p.onDetails
 * @param {function} p.onEdit
 * @param {function} p.onQuickAddendum
 * @param {function} p.onDelete
 * @param {boolean} p.canEdit
 * @param {boolean} p.canAddendum
 * @param {boolean} p.canDeletePerm
 */
export function getContractListColumns({
  formatCurrency,
  onDetails,
  onEdit,
  onQuickAddendum,
  onDelete,
  canEdit,
  canAddendum,
  canDeletePerm,
}) {
  return [
    {
      id: 'number',
      label: 'Número',
      width: '10%',
      minWidth: 0,
      sortable: true,
      accessor: (c) => c.number || '',
      render: (c) => (
        <Typography component="span" color="primary" fontWeight={600} fontSize="0.875rem">
          {c.number}
        </Typography>
      ),
    },
    {
      id: 'supplier',
      label: 'Fornecedor',
      width: '16%',
      minWidth: 0,
      sortable: true,
      accessor: (c) => c.supplier?.name || '',
      render: (c) => (
        <Typography color="text.primary" fontWeight={500} fontSize="0.875rem">
          {c.supplier?.name || '-'}
        </Typography>
      ),
    },
    {
      id: 'description',
      label: 'Objeto',
      width: '22%',
      minWidth: 0,
      sortable: true,
      accessor: (c) => c.description || '',
      cellSx: () => ({ maxWidth: 0 }),
      render: (c) => (
        <Typography
          color="text.secondary"
          fontSize="0.875rem"
          noWrap
          title={c.description}
          sx={{ maxWidth: { xs: 180, sm: 250 } }}
        >
          {c.description}
        </Typography>
      ),
    },
    {
      id: 'period',
      label: 'Vigência',
      width: '16%',
      minWidth: 0,
      sortable: true,
      accessor: (c) => (c.endDate ? new Date(c.endDate).getTime() : 0),
      render: (c) => (
        <Typography component="span" color="text.secondary" fontSize="0.8125rem">
          {format(new Date(c.startDate), 'dd/MM/yyyy')} - {format(new Date(c.endDate), 'dd/MM/yyyy')}
        </Typography>
      ),
    },
    {
      id: 'value',
      label: 'Valor',
      width: '11%',
      minWidth: 0,
      sortable: true,
      align: 'right',
      accessor: (c) => Number(c.value) || 0,
      render: (c) => (
        <Typography textAlign="right" color="text.primary" fontWeight={600} fontSize="0.875rem">
          {formatCurrency(c.value)}
        </Typography>
      ),
    },
    {
      id: 'status',
      label: 'Status',
      width: '13%',
      minWidth: 0,
      sortable: true,
      accessor: (c) => getContractStatus(c),
      render: (c) => {
        const status = getContractStatus(c);
        const st = getContractStatusStyle(status);
        const icon = status === 'VIGENTE' ? 'check_circle' : status === 'A VENCER' ? 'schedule' : 'error';
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 600,
              background: st.bg,
              color: st.color,
            }}
          >
            <span className="material-icons-round" style={{ fontSize: '14px' }}>
              {icon}
            </span>
            {status}
          </span>
        );
      },
    },
    {
      id: 'actions',
      label: 'Ações',
      sortable: false,
      width: '12%',
      minWidth: 0,
      align: 'right',
      render: (contract) => (
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }} onClick={(e) => e.stopPropagation()}>
          <Tooltip title="Ver Detalhes">
            <IconButton
              size="small"
              onClick={() => onDetails(contract)}
              sx={{
                width: 32,
                height: 32,
                borderRadius: '8px',
                border: '1px solid',
                borderColor: 'divider',
                color: 'text.secondary',
                '&:hover': {
                  bgcolor: 'action.hover',
                  borderColor: 'primary.main',
                  color: 'primary.main',
                },
              }}
            >
              <span className="material-icons-round" style={{ fontSize: '18px' }}>
                visibility
              </span>
            </IconButton>
          </Tooltip>
          {canEdit && (
            <Tooltip title="Editar">
              <IconButton
                size="small"
                onClick={() => onEdit(contract)}
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: '8px',
                  border: '1px solid',
                  borderColor: 'divider',
                  color: 'text.secondary',
                  '&:hover': {
                    bgcolor: 'action.hover',
                    borderColor: 'primary.main',
                    color: 'primary.main',
                  },
                }}
              >
                <span className="material-icons-round" style={{ fontSize: '18px' }}>
                  edit
                </span>
              </IconButton>
            </Tooltip>
          )}
          {canAddendum && (
            <Tooltip title="Aditivo Rápido">
              <IconButton
                size="small"
                onClick={() => onQuickAddendum(contract)}
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: '8px',
                  border: '1px solid',
                  borderColor: 'divider',
                  color: 'text.secondary',
                  '&:hover': {
                    bgcolor: 'action.hover',
                    borderColor: 'info.main',
                    color: 'info.main',
                  },
                }}
              >
                <span className="material-icons-round" style={{ fontSize: '18px' }}>
                  note_add
                </span>
              </IconButton>
            </Tooltip>
          )}
          {canDeletePerm && (
            <Tooltip title="Excluir">
              <IconButton
                size="small"
                onClick={() => onDelete(contract.id)}
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: '8px',
                  border: '1px solid',
                  borderColor: 'divider',
                  color: 'text.secondary',
                  '&:hover': {
                    bgcolor: 'error.light',
                    borderColor: 'error.main',
                    color: 'error.main',
                    opacity: 1,
                  },
                }}
              >
                <span className="material-icons-round" style={{ fontSize: '18px' }}>
                  delete
                </span>
              </IconButton>
            </Tooltip>
          )}
        </Box>
      ),
    },
  ];
}
