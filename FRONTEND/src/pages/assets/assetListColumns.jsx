import { Box, Typography, Checkbox, IconButton, Tooltip } from '@mui/material';

function formatBrl(val) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
}

/**
 * Colunas DataListTable — inventário de hardware.
 */
export function getAssetColumns({
  textPrimary,
  textSecondary,
  textMuted,
  surfaceBg,
  softBorder,
  getStatusLabel,
  getStatusStyle,
  canEdit,
  selectedIds,
  setSelectedIds,
  onView,
  onEdit,
  onOpenMenu,
}) {
  return [
    {
      id: '__select',
      label: '',
      sortable: false,
      width: 48,
      minWidth: 48,
      align: 'center',
      accessor: () => '',
      renderHeader: ({ paginatedRows }) => {
        const pageIds = paginatedRows.map((a) => a.id);
        const allSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.includes(id));
        const someSelected = pageIds.some((id) => selectedIds.includes(id)) && !allSelected;
        return (
          <Checkbox
            size="small"
            checked={allSelected}
            indeterminate={someSelected}
            onChange={() => {
              if (allSelected) {
                setSelectedIds((prev) => prev.filter((id) => !pageIds.includes(id)));
              } else {
                setSelectedIds(pageIds);
              }
            }}
            sx={{
              color: '#64748b',
              '&.Mui-checked': { color: '#667eea' },
              '&.MuiCheckbox-indeterminate': { color: '#667eea' },
            }}
          />
        );
      },
      render: (asset) => (
        <Box onClick={(e) => e.stopPropagation()}>
          <Checkbox
            size="small"
            checked={selectedIds.includes(asset.id)}
            onChange={() =>
              setSelectedIds((prev) =>
                prev.includes(asset.id) ? prev.filter((id) => id !== asset.id) : [...prev, asset.id]
              )
            }
            sx={{ color: '#64748b', '&.Mui-checked': { color: '#667eea' } }}
          />
        </Box>
      ),
    },
    {
      id: 'assetName',
      label: 'Ativo',
      accessor: (r) => r.name || '',
      cellSx: () => ({ minWidth: 200 }),
      render: (asset) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: '8px',
              background: 'rgba(37, 99, 235, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#2563eb',
            }}
          >
            <span className="material-icons-round" style={{ fontSize: 20 }}>computer</span>
          </Box>
          <Box>
            <Typography sx={{ color: textPrimary, fontWeight: 600, fontSize: 14 }}>{asset.name}</Typography>
            <Typography sx={{ color: textMuted, fontSize: 12 }}>{asset.code}</Typography>
          </Box>
        </Box>
      ),
    },
    {
      id: 'categoryName',
      label: 'Categoria',
      accessor: (r) => r.category?.name || '',
      render: (asset) => (
        <Typography sx={{ color: textSecondary, fontSize: 14 }}>{asset.category?.name || '—'}</Typography>
      ),
    },
    {
      id: 'status',
      label: 'Status',
      accessor: (r) => r.status || '',
      render: (asset) => {
        const statusStyle = getStatusStyle(asset.status);
        return (
          <span
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              fontSize: 12,
              fontWeight: 600,
              background: statusStyle.bg,
              color: statusStyle.color,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {getStatusLabel(asset.status)}
          </span>
        );
      },
    },
    {
      id: 'location',
      label: 'Localização',
      accessor: (r) => r.location || '',
      render: (asset) => (
        <Typography sx={{ color: textSecondary, fontSize: 14 }}>{asset.location || '—'}</Typography>
      ),
    },
    {
      id: 'acquisitionValue',
      label: 'Valor',
      align: 'right',
      accessor: (r) => Number(r.acquisitionValue) || 0,
      render: (asset) => (
        <Typography sx={{ color: textPrimary, fontWeight: 600, fontSize: 14 }}>
          {formatBrl(asset.acquisitionValue)}
        </Typography>
      ),
    },
    {
      id: 'actions',
      label: 'Ações',
      align: 'center',
      sortable: false,
      width: 140,
      minWidth: 120,
      render: (asset) => (
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }} onClick={(e) => e.stopPropagation()}>
          <Tooltip title="Visualizar">
            <IconButton
              size="small"
              aria-label="Visualizar ativo"
              onClick={() => onView(asset)}
              sx={{
                width: 32,
                height: 32,
                borderRadius: '8px',
                background: surfaceBg,
                border: softBorder,
                color: textSecondary,
                '&:hover': { background: 'rgba(37, 99, 235, 0.15)', borderColor: '#2563eb', color: '#2563eb' },
              }}
            >
              <span className="material-icons-round" style={{ fontSize: 18 }}>visibility</span>
            </IconButton>
          </Tooltip>
          {canEdit && (
            <Tooltip title="Editar">
              <IconButton
                size="small"
                aria-label="Editar ativo"
                onClick={() => onEdit(asset)}
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: '8px',
                  background: surfaceBg,
                  border: softBorder,
                  color: textSecondary,
                  '&:hover': { background: 'rgba(37, 99, 235, 0.15)', borderColor: '#2563eb', color: '#2563eb' },
                }}
              >
                <span className="material-icons-round" style={{ fontSize: 18 }}>edit</span>
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title="Mais opções">
            <IconButton
              size="small"
              aria-label="Mais opções"
              onClick={(e) => onOpenMenu(e, asset)}
              sx={{
                width: 32,
                height: 32,
                borderRadius: '8px',
                background: surfaceBg,
                border: softBorder,
                color: textSecondary,
                '&:hover': { background: 'rgba(37, 99, 235, 0.15)', borderColor: '#2563eb', color: '#2563eb' },
              }}
            >
              <span className="material-icons-round" style={{ fontSize: 18 }}>more_vert</span>
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];
}
