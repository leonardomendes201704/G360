import { Box, Button, Chip, IconButton, Tooltip, Typography } from '@mui/material';
import { Add, Delete, Edit, PendingActions, ReceiptLong, Visibility } from '@mui/icons-material';
import { format } from 'date-fns';
import { getFileURL } from '../../../utils/urlUtils';

/**
 * Colunas `DataListTable` — custos do projeto (aba Custos).
 */
export function getProjectCostListColumns({
  colors,
  getCategoryConfig,
  getStatusConfig,
  formatCurrency,
  getDisplayRowNumber,
  onSubmitForApproval,
  onOpenEdit,
  onDelete,
}) {
  return [
    {
      id: 'id',
      label: 'ID',
      width: '8%',
      minWidth: 72,
      sortable: true,
      accessor: (r) => r.id,
      cellSx: () => ({ fontFamily: 'monospace' }),
      render: (exp) => (
        <Typography sx={{ fontFamily: 'monospace', fontSize: 'inherit', color: colors.textMuted }}>
          #CST-{String(getDisplayRowNumber(exp)).padStart(3, '0')}
        </Typography>
      ),
    },
    {
      id: 'description',
      label: 'Descrição',
      width: '22%',
      minWidth: 120,
      sortable: true,
      accessor: (r) => r.description || '',
      render: (exp) => (
        <Box>
          <Typography sx={{ fontWeight: 500, color: colors.textPrimary }}>{exp.description}</Typography>
          {exp.invoiceNumber && (
            <Typography sx={{ fontSize: '0.7rem', color: colors.textMuted, fontFamily: 'monospace' }}>
              NF: {exp.invoiceNumber}
            </Typography>
          )}
        </Box>
      ),
    },
    {
      id: 'category',
      label: 'Categoria',
      width: '12%',
      minWidth: 88,
      sortable: true,
      accessor: (r) => r.type || '',
      render: (exp) => {
        const catConfig = getCategoryConfig(exp.type);
        return (
          <Chip
            label={catConfig.label}
            size="small"
            sx={{
              background: catConfig.bgColor,
              color: catConfig.color,
              border: `1px solid ${catConfig.borderColor}`,
              fontWeight: 500,
              fontSize: '0.65rem',
              borderRadius: '8px',
            }}
          />
        );
      },
    },
    {
      id: 'date',
      label: 'Data',
      width: '10%',
      minWidth: 88,
      sortable: true,
      accessor: (r) => (r.date ? new Date(r.date).getTime() : 0),
      render: (exp) => (
        <Typography sx={{ color: colors.textPrimary }}>{format(new Date(exp.date), 'dd/MM/yyyy')}</Typography>
      ),
    },
    {
      id: 'amount',
      label: 'Valor',
      align: 'right',
      width: '11%',
      minWidth: 88,
      sortable: true,
      accessor: (r) => Number(r.amount || 0),
      render: (exp) => (
        <Typography sx={{ fontWeight: 600, fontFamily: 'monospace', color: colors.textPrimary }}>
          {formatCurrency(exp.amount)}
        </Typography>
      ),
    },
    {
      id: 'status',
      label: 'Status',
      width: '14%',
      minWidth: 100,
      sortable: true,
      accessor: (r) => r.status || '',
      render: (exp) => {
        const statusConfig = getStatusConfig(exp.status);
        return (
          <Chip
            label={statusConfig.label}
            size="small"
            sx={{
              background: statusConfig.bgColor,
              color: statusConfig.color,
              border: `1px solid ${statusConfig.borderColor}`,
              fontWeight: 600,
              fontSize: '0.55rem',
              textTransform: 'uppercase',
              borderRadius: '8px',
            }}
          />
        );
      },
    },
    {
      id: 'actions',
      label: 'Ações',
      align: 'right',
      width: '12%',
      minWidth: 120,
      sortable: false,
      render: (exp) => (
        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }} onClick={(e) => e.stopPropagation()}>
          {exp.fileUrl && (
            <Tooltip title="Ver Anexo">
              <IconButton
                size="small"
                href={getFileURL(exp.fileUrl)}
                target="_blank"
                rel="noopener noreferrer"
                sx={{ color: colors.textMuted, '&:hover': { background: colors.bgTertiary, color: colors.textPrimary } }}
              >
                <Visibility fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          {(exp.status === 'PREVISTO' || exp.status === 'NAO_PREVISTO' || exp.status === 'RETURNED') && (
            <Tooltip title={exp.status === 'RETURNED' ? 'Reenviar para Aprovação' : 'Submeter para Aprovação'}>
              <IconButton
                size="small"
                onClick={() => onSubmitForApproval(exp.id)}
                sx={{ color: colors.textMuted, '&:hover': { background: colors.bgTertiary, color: colors.accentAmber } }}
              >
                <PendingActions fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          {!['APROVADO', 'REALIZADO', 'PAGO'].includes(exp.status) && (
            <>
              <Tooltip title="Editar">
                <IconButton
                  size="small"
                  onClick={() => onOpenEdit(exp)}
                  sx={{ color: colors.textMuted, '&:hover': { background: colors.bgTertiary, color: colors.textPrimary } }}
                >
                  <Edit fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Excluir">
                <IconButton
                  size="small"
                  onClick={() => onDelete(exp)}
                  sx={{ color: colors.textMuted, '&:hover': { background: colors.bgTertiary, color: colors.accentRose } }}
                >
                  <Delete fontSize="small" />
                </IconButton>
              </Tooltip>
            </>
          )}
        </Box>
      ),
    },
  ];
}

/**
 * Estado vazio: sem lançamentos ou sem resultados de busca.
 */
export function renderProjectCostEmptyContent({ colors, hasAnyExpenses, onCreate }) {
  if (!hasAnyExpenses) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 2 }}>
        <Box
          sx={{
            width: 80,
            height: 80,
            borderRadius: '8px',
            background: colors.accentIndigoSoft,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mb: 3,
          }}
        >
          <ReceiptLong sx={{ fontSize: 40, color: colors.accentIndigo }} />
        </Box>
        <Typography sx={{ fontSize: 18, fontWeight: 600, color: colors.textPrimary, mb: 1 }}>Nenhum custo cadastrado</Typography>
        <Typography sx={{ fontSize: 14, color: colors.textMuted, maxWidth: 360, textAlign: 'center', mb: 3 }}>
          Comece adicionando os custos do projeto para acompanhar o orçamento e as despesas.
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={onCreate}
          sx={{
            background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
            borderRadius: '8px',
            textTransform: 'none',
            fontWeight: 600,
            px: 3,
          }}
        >
          Lançar Primeiro Custo
        </Button>
      </Box>
    );
  }
  return (
    <Typography sx={{ color: colors.textMuted, py: 2 }}>Nenhum custo corresponde à busca.</Typography>
  );
}
