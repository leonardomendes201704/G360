import { Box, Checkbox, IconButton, Tooltip, Typography } from '@mui/material';
import { formatDocument, maskPhone } from '../../utils/masks';
import { getSupplierInitials, getSupplierStatusStyle } from './supplierListUtils';

function renderRatingStars(rating = 5) {
  const stars = [];
  for (let i = 1; i <= 5; i += 1) {
    stars.push(
      <span
        key={i}
        className="material-icons-round"
        style={{
          fontSize: '16px',
          color: i <= rating ? '#f59e0b' : '#64748b',
        }}
      >
        {i <= rating ? 'star' : 'star_border'}
      </span>
    );
  }
  return <div style={{ display: 'flex', gap: '2px' }}>{stars}</div>;
}

/**
 * @param {object} p
 * @param {Array} p.allRows — linhas filtradas (seleção global no cabeçalho)
 * @param {string[]} p.selectedIds
 * @param {function} p.setSelectedIds
 * @param {function} p.onView
 * @param {function} p.onEdit
 * @param {function} p.onDelete
 * @param {boolean} p.canEdit
 * @param {boolean} p.canDeletePerm
 */
export function getSupplierListColumns({
  allRows,
  selectedIds,
  setSelectedIds,
  onView,
  onEdit,
  onDelete,
  canEdit,
  canDeletePerm,
}) {
  const allIds = allRows.map((s) => s.id);
  const allFilteredSelected =
    allIds.length > 0 && allIds.every((id) => selectedIds.includes(id));
  const someFilteredSelected = allIds.some((id) => selectedIds.includes(id)) && !allFilteredSelected;

  return [
    {
      id: '__select',
      label: '',
      sortable: false,
      width: '3%',
      minWidth: 44,
      align: 'center',
      renderHeader: () => (
        <Checkbox
          size="small"
          checked={allFilteredSelected}
          indeterminate={someFilteredSelected}
          onChange={() => {
            if (allFilteredSelected) setSelectedIds([]);
            else setSelectedIds([...allIds]);
          }}
          sx={{
            color: '#94a3b8',
            '&.Mui-checked': { color: '#667eea' },
            '&.MuiCheckbox-indeterminate': { color: '#667eea' },
          }}
        />
      ),
      render: (s) => {
        const isSelected = selectedIds.includes(s.id);
        return (
          <Box onClick={(e) => e.stopPropagation()}>
            <Checkbox
              size="small"
              checked={isSelected}
              onChange={() =>
                setSelectedIds((prev) =>
                  isSelected ? prev.filter((id) => id !== s.id) : [...prev, s.id]
                )
              }
              sx={{ color: '#94a3b8', '&.Mui-checked': { color: '#667eea' } }}
            />
          </Box>
        );
      },
    },
    {
      id: 'name',
      label: 'Fornecedor',
      width: '24%',
      minWidth: 0,
      sortable: true,
      accessor: (s) => s.name || '',
      render: (s) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: '8px',
              background: 'rgba(6, 182, 212, 0.15)',
              border: '1px solid rgba(6, 182, 212, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 600,
              color: '#06b6d4',
              fontSize: '14px',
            }}
          >
            {getSupplierInitials(s.name)}
          </Box>
          <Box>
            <Typography color="text.primary" fontWeight={600} fontSize="0.875rem" display="block">
              {s.name}
            </Typography>
            <Typography color="text.secondary" fontSize="0.75rem">
              CNPJ: {formatDocument(s.document)}
            </Typography>
          </Box>
        </Box>
      ),
    },
    {
      id: 'category',
      label: 'Categoria',
      width: '12%',
      minWidth: 0,
      sortable: true,
      accessor: (s) => s.category || 'Tecnologia',
      render: (s) => (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 12px',
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: 600,
            background: 'rgba(59, 130, 246, 0.15)',
            color: '#3b82f6',
          }}
        >
          {s.category || 'Tecnologia'}
        </span>
      ),
    },
    {
      id: 'contact',
      label: 'Contato Principal',
      width: '15%',
      minWidth: 0,
      sortable: true,
      render: (s) => (
        <Typography color="text.secondary" fontSize="0.875rem">
          {s.contactName || s.tradeName || '-'}
        </Typography>
      ),
    },
    {
      id: 'phone',
      label: 'Telefone',
      width: '12%',
      minWidth: 0,
      sortable: true,
      accessor: (s) => s.phone || '',
      render: (s) => (
        <Typography color="text.secondary" fontSize="0.875rem">
          {s.phone ? maskPhone(s.phone) : '-'}
        </Typography>
      ),
    },
    {
      id: 'rating',
      label: 'Avaliação',
      width: '10%',
      minWidth: 0,
      sortable: true,
      accessor: (s) => Number(s.rating) || 5,
      render: (s) => renderRatingStars(s.rating || 5),
    },
    {
      id: 'status',
      label: 'Status',
      width: '12%',
      minWidth: 0,
      sortable: true,
      accessor: (s) => s?.status || 'ATIVO',
      render: (s) => {
        const st = getSupplierStatusStyle(s.status);
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
            {st.icon} {st.label}
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
      align: 'center',
      render: (s) => (
        <Box
          sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}
          onClick={(e) => e.stopPropagation()}
        >
          <Tooltip title="Visualizar">
            <IconButton
              size="small"
              onClick={() => onView(s)}
              sx={{
                width: 32,
                height: 32,
                borderRadius: '8px',
                border: '1px solid',
                borderColor: 'divider',
                color: 'text.secondary',
                '&:hover': { borderColor: 'info.main', color: 'info.main' },
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
                onClick={() => onEdit(s)}
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: '8px',
                  border: '1px solid',
                  borderColor: 'divider',
                  color: 'text.secondary',
                  '&:hover': { borderColor: 'info.main', color: 'info.main' },
                }}
              >
                <span className="material-icons-round" style={{ fontSize: '18px' }}>
                  edit
                </span>
              </IconButton>
            </Tooltip>
          )}
          {canDeletePerm && (
            <Tooltip title="Excluir">
              <IconButton
                size="small"
                onClick={() => onDelete(s)}
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: '8px',
                  border: '1px solid',
                  borderColor: 'divider',
                  color: 'text.secondary',
                  '&:hover': { borderColor: 'error.main', color: 'error.main' },
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
