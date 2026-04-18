import { Box, Typography, IconButton, Tooltip } from '@mui/material';

function formatBrl(val) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
}

const typeLabel = (t) => {
  if (t === 'PERPETUA') return 'Perpétua';
  if (t === 'ASSINATURA') return 'Assinatura';
  return t || 'Anual';
};

/**
 * Colunas DataListTable — licenças de software.
 */
export function getLicenseColumns({
  textPrimary,
  textSecondary,
  textMuted,
  surfaceBg,
  softBorder,
  canEdit,
  canDelete,
  onView,
  onEdit,
  onDelete,
}) {
  return [
    {
      id: 'name',
      label: 'Software',
      accessor: (r) => r.name || '',
      cellSx: () => ({ minWidth: 220 }),
      render: (license) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: '8px',
              background: 'rgba(59, 130, 246, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#3b82f6',
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            {license.name?.substring(0, 2).toUpperCase()}
          </Box>
          <Box>
            <Typography sx={{ color: textPrimary, fontWeight: 600, fontSize: 14 }}>{license.name}</Typography>
            <Typography sx={{ color: textMuted, fontSize: 12 }}>
              {license.licenseKey ? `Chave: ${license.licenseKey.substring(0, 8)}...` : 'Sem chave'}
            </Typography>
          </Box>
        </Box>
      ),
    },
    {
      id: 'vendor',
      label: 'Fabricante',
      accessor: (r) => r.vendor || '',
      render: (license) => (
        <Typography sx={{ color: textSecondary, fontSize: 14 }}>{license.vendor}</Typography>
      ),
    },
    {
      id: 'licenseType',
      label: 'Tipo licença',
      accessor: (r) => r.licenseType || '',
      render: (license) => (
        <span
          style={{
            padding: '6px 12px',
            borderRadius: '8px',
            fontSize: 12,
            fontWeight: 600,
            background: license.licenseType === 'PERPETUA' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(37, 99, 235, 0.15)',
            color: license.licenseType === 'PERPETUA' ? '#10b981' : '#2563eb',
          }}
        >
          {typeLabel(license.licenseType)}
        </span>
      ),
    },
    {
      id: 'quantity',
      label: 'Quantidade',
      align: 'right',
      accessor: (r) => Number(r.quantity) || 0,
      render: (license) => (
        <Typography sx={{ color: textPrimary, fontWeight: 600, fontSize: 14 }}>{license.quantity}</Typography>
      ),
    },
    {
      id: 'expirationSort',
      label: 'Expiração',
      accessor: (r) => (r.expirationDate ? new Date(r.expirationDate).getTime() : null),
      render: (license) => {
        const isExpiring =
          license.expirationDate &&
          (new Date(license.expirationDate) - new Date()) / (1000 * 60 * 60 * 24) <= 30;
        const isExpired = license.expirationDate && new Date(license.expirationDate) < new Date();
        if (license.expirationDate) {
          return (
            <span
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: 12,
                fontWeight: 600,
                background: isExpired
                  ? 'rgba(244, 63, 94, 0.15)'
                  : isExpiring
                    ? 'rgba(245, 158, 11, 0.15)'
                    : 'rgba(16, 185, 129, 0.15)',
                color: isExpired ? '#f43f5e' : isExpiring ? '#f59e0b' : '#10b981',
              }}
            >
              {new Date(license.expirationDate).toLocaleDateString('pt-BR')}
            </span>
          );
        }
        return (
          <Typography sx={{ color: textMuted, fontSize: 14 }}>Perpétua</Typography>
        );
      },
    },
    {
      id: 'cost',
      label: 'Custo',
      align: 'right',
      accessor: (r) => Number(r.cost) || 0,
      render: (license) => (
        <Typography sx={{ color: textPrimary, fontWeight: 600, fontSize: 14 }}>{formatBrl(license.cost)}</Typography>
      ),
    },
    {
      id: 'actions',
      label: 'Ações',
      align: 'center',
      sortable: false,
      width: 130,
      minWidth: 120,
      render: (license) => (
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }} onClick={(e) => e.stopPropagation()}>
          <Tooltip title="Visualizar">
            <IconButton
              size="small"
              aria-label="Visualizar licença"
              onClick={() => onView(license)}
              sx={{
                width: 32,
                height: 32,
                borderRadius: '8px',
                background: surfaceBg,
                border: softBorder,
                color: textSecondary,
                '&:hover': { background: 'rgba(59, 130, 246, 0.15)', borderColor: '#3b82f6', color: '#3b82f6' },
              }}
            >
              <span className="material-icons-round" style={{ fontSize: 18 }}>visibility</span>
            </IconButton>
          </Tooltip>
          {canEdit && (
            <Tooltip title="Editar">
              <IconButton
                size="small"
                aria-label="Editar licença"
                onClick={() => onEdit(license)}
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: '8px',
                  background: surfaceBg,
                  border: softBorder,
                  color: textSecondary,
                  '&:hover': { background: 'rgba(59, 130, 246, 0.15)', borderColor: '#3b82f6', color: '#3b82f6' },
                }}
              >
                <span className="material-icons-round" style={{ fontSize: 18 }}>edit</span>
              </IconButton>
            </Tooltip>
          )}
          {canDelete && (
            <Tooltip title="Excluir">
              <IconButton
                size="small"
                aria-label="Excluir licença"
                onClick={() => onDelete(license)}
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: '8px',
                  background: surfaceBg,
                  border: softBorder,
                  color: textSecondary,
                  '&:hover': { background: 'rgba(244, 63, 94, 0.15)', borderColor: '#f43f5e', color: '#f43f5e' },
                }}
              >
                <span className="material-icons-round" style={{ fontSize: 18 }}>delete</span>
              </IconButton>
            </Tooltip>
          )}
        </Box>
      ),
    },
  ];
}
