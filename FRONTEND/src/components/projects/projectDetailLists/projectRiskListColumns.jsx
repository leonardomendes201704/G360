import { Box, Chip, IconButton, Typography } from '@mui/material';
import { Delete, Edit, Visibility } from '@mui/icons-material';

/**
 * Colunas `DataListTable` — riscos do projeto.
 */
export function getProjectRiskListColumns({
  textPrimary,
  textMuted,
  categories,
  getCategoryTag,
  getImpactText,
  getImpactColor,
  getStatusText,
  getStatusColor,
  getDisplayRowNumber,
  onView,
  onEdit,
  onDelete,
}) {
  return [
    {
      id: 'id',
      label: 'ID',
      width: '9%',
      minWidth: 72,
      sortable: true,
      accessor: (r) => r.id,
      cellSx: () => ({ fontFamily: 'monospace' }),
      render: (risk) => (
        <Typography sx={{ color: '#2563eb', fontWeight: 600, fontFamily: 'monospace', fontSize: 'inherit' }}>
          RSK-{String(getDisplayRowNumber(risk)).padStart(3, '0')}
        </Typography>
      ),
    },
    {
      id: 'description',
      label: 'Descrição',
      width: '28%',
      minWidth: 120,
      sortable: true,
      accessor: (r) => r.description || '',
      render: (risk) => (
        <Typography sx={{ color: textPrimary, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {risk.description}
        </Typography>
      ),
    },
    {
      id: 'category',
      label: 'Categoria',
      width: '14%',
      minWidth: 96,
      sortable: true,
      accessor: (r) => r.category || '',
      render: (risk) => (
        <Chip
          label={getCategoryTag(risk.category)}
          size="small"
          sx={{
            bgcolor: `${categories.find((c) => c.key === risk.category)?.color || '#64748b'}20`,
            color: categories.find((c) => c.key === risk.category)?.color || '#64748b',
            fontWeight: 500,
            fontSize: '0.65rem',
          }}
        />
      ),
    },
    {
      id: 'impact',
      label: 'Impacto',
      width: '12%',
      minWidth: 88,
      sortable: true,
      accessor: (r) => r.impact || '',
      render: (risk) => (
        <Chip
          label={getImpactText(risk.impact)}
          size="small"
          sx={{
            bgcolor: `${getImpactColor(risk.impact)}20`,
            color: getImpactColor(risk.impact),
            fontWeight: 600,
            fontSize: '0.65rem',
          }}
        />
      ),
    },
    {
      id: 'status',
      label: 'Status',
      width: '14%',
      minWidth: 100,
      sortable: true,
      accessor: (r) => r.status || '',
      render: (risk) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 8, height: 8, borderRadius: '8px', background: getStatusColor(risk.status) }} />
          <Typography sx={{ fontSize: 'inherit', color: textMuted }}>{getStatusText(risk.status)}</Typography>
        </Box>
      ),
    },
    {
      id: 'actions',
      label: 'Ações',
      align: 'right',
      width: '12%',
      minWidth: 108,
      sortable: false,
      render: (risk) => (
        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }} onClick={(e) => e.stopPropagation()}>
          <IconButton size="small" onClick={() => onView(risk)} sx={{ color: textMuted, '&:hover': { color: '#2563eb', background: 'rgba(37, 99, 235, 0.1)' } }}>
            <Visibility fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={() => onEdit(risk)} sx={{ color: textMuted, '&:hover': { color: '#2563eb', background: 'rgba(37, 99, 235, 0.1)' } }}>
            <Edit fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={() => onDelete(risk.id)} sx={{ color: textMuted, '&:hover': { color: '#f43f5e', background: 'rgba(244, 63, 94, 0.1)' } }}>
            <Delete fontSize="small" />
          </IconButton>
        </Box>
      ),
    },
  ];
}
