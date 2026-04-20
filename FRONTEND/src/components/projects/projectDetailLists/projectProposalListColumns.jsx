import { Box, Button, Chip, Typography, Avatar } from '@mui/material';
import {
  CheckCircle,
  Cancel,
  Pending,
  Send,
  Payments,
  Edit,
  Delete,
  AttachFile,
} from '@mui/icons-material';

/**
 * Colunas `DataListTable` — propostas do projeto (aba Propostas).
 */
export function getProjectProposalListColumns({
  colors,
  suppliers,
  getStatusConfig,
  formatCurrency,
  canApprove,
  handleSubmitForApproval,
  handleOpenConditionModal,
  handleOpenEdit,
  handleDelete,
}) {
  const supplierOf = (p) => suppliers.find((s) => s.id === p.supplierId);

  return [
    {
      id: 'description',
      label: 'Descrição',
      width: '26%',
      minWidth: 160,
      sortable: true,
      accessor: (r) => r.description || '',
      render: (proposal) => (
        <Box>
          <Typography sx={{ fontWeight: 600, color: colors.textPrimary, fontSize: 'inherit' }}>
            {proposal.description || 'Proposta sem descrição'}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap', mt: 0.25 }}>
            <Typography sx={{ fontSize: '0.7rem', color: colors.textMuted, fontFamily: 'monospace' }}>
              #{proposal.id}
            </Typography>
            {proposal.fileUrl && (
              <Chip
                icon={<AttachFile sx={{ fontSize: '0.75rem !important' }} />}
                label="Anexo"
                size="small"
                sx={{
                  height: 20,
                  fontSize: '0.65rem',
                  color: '#2563eb',
                  bgcolor: 'rgba(37, 99, 235, 0.08)',
                  '& .MuiChip-icon': { color: '#2563eb' },
                }}
              />
            )}
          </Box>
          {proposal.notes && (
            <Typography
              sx={{
                fontSize: '0.75rem',
                color: colors.textSecondary,
                mt: 0.5,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
              title={proposal.notes}
            >
              {proposal.notes}
            </Typography>
          )}
        </Box>
      ),
    },
    {
      id: 'supplier',
      label: 'Fornecedor',
      width: '22%',
      minWidth: 140,
      sortable: true,
      accessor: (r) => supplierOf(r)?.name || '',
      render: (proposal) => {
        const supplier = supplierOf(proposal);
        const supplierName = supplier?.name || 'Fornecedor não especificado';
        const initials = supplierName.substring(0, 2).toUpperCase();
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Avatar
              sx={{
                width: 32,
                height: 32,
                background: 'linear-gradient(135deg, #06b6d4, #2563eb)',
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              {initials}
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontWeight: 500, color: colors.textPrimary, fontSize: 'inherit' }} noWrap>
                {supplierName}
              </Typography>
              <Typography sx={{ fontSize: '0.7rem', color: colors.textMuted, fontFamily: 'monospace' }} noWrap>
                {supplier?.cnpj || 'CNPJ não cadastrado'}
              </Typography>
            </Box>
          </Box>
        );
      },
    },
    {
      id: 'value',
      label: 'Valor',
      width: '12%',
      minWidth: 100,
      sortable: true,
      align: 'right',
      accessor: (r) => r.value ?? 0,
      render: (proposal) => (
        <Typography
          sx={{
            fontWeight: 600,
            fontFamily: 'monospace',
            fontSize: 'inherit',
            color: proposal.status === 'REJEITADA' ? '#64748b' : '#10b981',
            textDecoration: proposal.status === 'REJEITADA' ? 'line-through' : 'none',
          }}
        >
          {formatCurrency(proposal.value)}
        </Typography>
      ),
    },
    {
      id: 'status',
      label: 'Status',
      width: '18%',
      minWidth: 140,
      sortable: true,
      accessor: (r) => `${r.isWinner ? '1' : '0'}_${r.status || ''}`,
      render: (proposal) => {
        const statusConfig = getStatusConfig(proposal);
        return (
          <Chip
            icon={
              proposal.isWinner ? (
                <CheckCircle sx={{ fontSize: 14 }} />
              ) : proposal.status === 'REJEITADA' ? (
                <Cancel sx={{ fontSize: 14 }} />
              ) : (
                <Pending sx={{ fontSize: 14 }} />
              )
            }
            label={statusConfig.label}
            size="small"
            sx={{
              background: statusConfig.bgColor,
              color: statusConfig.color,
              border: `1px solid ${statusConfig.borderColor}`,
              fontWeight: 600,
              fontSize: '0.65rem',
              textTransform: 'uppercase',
              height: 26,
              maxWidth: '100%',
              '& .MuiChip-label': { px: 0.75, whiteSpace: 'normal', textAlign: 'left' },
              '& .MuiChip-icon': { color: statusConfig.color },
            }}
          />
        );
      },
    },
    {
      id: 'actions',
      label: 'Ações',
      width: '22%',
      minWidth: 200,
      sortable: false,
      align: 'right',
      render: (proposal) => (
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 0.75,
            justifyContent: 'flex-end',
            alignItems: 'center',
          }}
        >
          {(proposal.status === 'RASCUNHO' || proposal.status === 'DEVOLVIDA') && (
            <Button
              size="small"
              variant="contained"
              startIcon={<Send sx={{ fontSize: 16 }} />}
              onClick={(e) => {
                e.stopPropagation();
                handleSubmitForApproval(proposal.id);
              }}
              sx={{
                background:
                  proposal.status === 'DEVOLVIDA' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                color: proposal.status === 'DEVOLVIDA' ? '#f59e0b' : '#3b82f6',
                textTransform: 'none',
                fontWeight: 500,
                fontSize: 12,
                py: 0.5,
                minWidth: 0,
                boxShadow: 'none',
                '&:hover': {
                  background: proposal.status === 'DEVOLVIDA' ? '#f59e0b' : '#3b82f6',
                  color: 'white',
                  boxShadow: 'none',
                },
              }}
            >
              {proposal.status === 'DEVOLVIDA' ? 'Reenviar' : 'Submeter'}
            </Button>
          )}
          {proposal.status === 'AGUARDANDO_APROVACAO' && (
            <Typography sx={{ fontSize: 11, color: '#3b82f6', textAlign: 'right', maxWidth: 140 }}>
              Aguardando aprovação do gestor
            </Typography>
          )}
          {proposal.isWinner && (
            <Button
              size="small"
              variant="contained"
              startIcon={<Payments sx={{ fontSize: 16 }} />}
              onClick={(e) => {
                e.stopPropagation();
                handleOpenConditionModal(proposal);
              }}
              sx={{
                background: proposal.paymentCondition ? 'rgba(37, 99, 235, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                color: proposal.paymentCondition ? '#2563eb' : '#f59e0b',
                textTransform: 'none',
                fontWeight: 500,
                fontSize: 12,
                py: 0.5,
                minWidth: 0,
                boxShadow: 'none',
                '&:hover': {
                  background: proposal.paymentCondition ? '#2563eb' : '#f59e0b',
                  color: 'white',
                  boxShadow: 'none',
                },
              }}
            >
              {proposal.paymentCondition ? 'Condição' : 'Definir condição'}
            </Button>
          )}
          <Button
            size="small"
            variant="outlined"
            startIcon={<Edit sx={{ fontSize: 16 }} />}
            onClick={(e) => {
              e.stopPropagation();
              handleOpenEdit(proposal);
            }}
            sx={{
              background: colors.actionBg,
              color: colors.textSecondary,
              borderColor: colors.borderSubtle,
              textTransform: 'none',
              fontWeight: 500,
              fontSize: 12,
              py: 0.5,
              minWidth: 0,
              '&:hover': {
                borderColor: colors.isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.15)',
                background: colors.hoverBg,
              },
            }}
          >
            Editar
          </Button>
          {(!(proposal.isWinner || proposal.status === 'APROVADA') || canApprove) && (
            <Button
              size="small"
              variant="outlined"
              startIcon={<Delete sx={{ fontSize: 16 }} />}
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(proposal.id);
              }}
              sx={{
                background: colors.actionBg,
                color: '#f43f5e',
                borderColor: 'rgba(244, 63, 94, 0.2)',
                textTransform: 'none',
                fontWeight: 500,
                fontSize: 12,
                py: 0.5,
                minWidth: 0,
                '&:hover': {
                  borderColor: 'rgba(244, 63, 94, 0.3)',
                  background: 'rgba(244, 63, 94, 0.1)',
                },
              }}
            >
              {proposal.isWinner || proposal.status === 'APROVADA' ? 'Inativar' : 'Excluir'}
            </Button>
          )}
        </Box>
      ),
    },
  ];
}
