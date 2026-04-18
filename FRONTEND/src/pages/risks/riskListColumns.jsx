import { Add, Assignment, Delete, Edit, Visibility } from '@mui/icons-material';
import { Box, Avatar, Checkbox, Chip, IconButton, Tooltip, Typography } from '@mui/material';
import InlineStatusSelect from '../../components/common/InlineStatusSelect';
import { getSeverityLabel, RISK_STATUS_CONFIG, getRiskStatusOptions } from './riskListUtils';

const riskStatusOptions = getRiskStatusOptions();

/**
 * @param {object} p
 * @param {Array} p.allRows
 * @param {string[]} p.selectedIds
 * @param {function} p.setSelectedIds
 * @param {object} p.borderColor — string (tema)
 * @param p.textPrimary, p.textSecondary
 * @param {function} p.onStatusChange
 * @param {function} p.onAddPlan
 * @param {function} p.onEdit
 * @param {function} p.onView
 * @param {function} p.onDelete
 * @param {boolean} p.canEdit
 * @param {boolean} p.canDeletePerm
 */
export function getRiskListColumns({
  allRows,
  selectedIds,
  setSelectedIds,
  borderColor,
  textPrimary,
  textSecondary,
  onStatusChange,
  onAddPlan,
  onEdit,
  onView,
  onDelete,
  canEdit,
  canDeletePerm,
}) {
  const allIds = allRows.map((r) => r.id);
  const allSelected = allIds.length > 0 && allIds.every((id) => selectedIds.includes(id));
  const someSelected = allIds.some((id) => selectedIds.includes(id)) && !allSelected;

  return [
    {
      id: '__select',
      label: '',
      sortable: false,
      width: '3%',
      minWidth: 48,
      align: 'left',
      renderHeader: () => (
        <Checkbox
          size="small"
          checked={allSelected}
          indeterminate={someSelected}
          onChange={() => {
            if (allSelected) setSelectedIds([]);
            else setSelectedIds([...allIds]);
          }}
          sx={{
            color: '#64748b',
            '&.Mui-checked': { color: '#667eea' },
            '&.MuiCheckbox-indeterminate': { color: '#667eea' },
          }}
        />
      ),
      render: (risk) => {
        const is = selectedIds.includes(risk.id);
        return (
          <Box onClick={(e) => e.stopPropagation()}>
            <Checkbox
              size="small"
              checked={is}
              onChange={() =>
                setSelectedIds((prev) =>
                  is ? prev.filter((id) => id !== risk.id) : [...prev, risk.id]
                )
              }
              sx={{ color: '#64748b', '&.Mui-checked': { color: '#667eea' } }}
            />
          </Box>
        );
      },
    },
    {
      id: 'code',
      label: 'Código',
      width: '10%',
      minWidth: 0,
      sortable: true,
      accessor: (r) => r.code || '',
      cellSx: () => ({ fontFamily: 'monospace' }),
      render: (r) => (
        <Typography sx={{ color: textPrimary, fontSize: '13px', fontFamily: 'monospace' }}>{r.code}</Typography>
      ),
    },
    {
      id: 'title',
      label: 'Título',
      width: '20%',
      minWidth: 0,
      sortable: true,
      accessor: (r) => r.title || '',
      render: (r) => (
        <Typography sx={{ color: textPrimary, fontWeight: 600 }}>{r.title}</Typography>
      ),
    },
    {
      id: 'category',
      label: 'Categoria',
      width: '10%',
      minWidth: 0,
      sortable: true,
      render: (r) => (
        <Chip
          label={r.category}
          size="small"
          variant="outlined"
          sx={{ borderRadius: '8px', fontSize: '11px', color: textSecondary, borderColor }}
        />
      ),
    },
    {
      id: 'severity',
      label: 'Severidade',
      width: '12%',
      minWidth: 0,
      sortable: true,
      accessor: (r) => Number(r.severity) || 0,
      render: (r) => {
        const sev = getSeverityLabel(r.severity);
        return (
          <Chip
            label={`${r.severity} - ${sev.label}`}
            size="small"
            sx={{ bgcolor: sev.bg, color: sev.color, fontWeight: 700, borderRadius: '8px' }}
          />
        );
      },
    },
    {
      id: 'owner',
      label: 'Owner',
      width: '7%',
      minWidth: 0,
      sortable: true,
      render: (r) =>
        r.owner ? (
          <Tooltip title={r.owner.name}>
            <Avatar src={r.owner.avatar} sx={{ width: 24, height: 24, fontSize: '12px' }}>
              {r.owner.name?.charAt(0)}
            </Avatar>
          </Tooltip>
        ) : (
          '-'
        ),
    },
    {
      id: 'status',
      label: 'Status',
      width: '14%',
      minWidth: 0,
      sortable: true,
      accessor: (r) => r.status || '',
      render: (risk) => (
        <Box onClick={(e) => e.stopPropagation()}>
          <InlineStatusSelect
            status={risk.status}
            statusConfig={RISK_STATUS_CONFIG}
            statusOptions={riskStatusOptions}
            onStatusChange={(newStatus) => onStatusChange(risk.id, newStatus)}
            disabled={!canEdit}
          />
        </Box>
      ),
    },
    {
      id: 'plans',
      label: 'Planos',
      width: '12%',
      minWidth: 0,
      sortable: true,
      accessor: (r) => r.mitigationTasks?.length || 0,
      render: (risk) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }} onClick={(e) => e.stopPropagation()}>
          <Chip
            icon={<Assignment style={{ fontSize: 14 }} />}
            label={risk.mitigationTasks?.length || 0}
            size="small"
            variant="outlined"
            sx={{ borderRadius: '8px', fontSize: '11px', color: textSecondary, borderColor }}
          />
          <IconButton
            size="small"
            sx={{ padding: '2px' }}
            onClick={() => onAddPlan(risk.id)}
          >
            <Add style={{ fontSize: 16 }} />
          </IconButton>
        </Box>
      ),
    },
    {
      id: 'actions',
      label: 'Ações',
      sortable: false,
      width: '12%',
      minWidth: 0,
      align: 'right',
      render: (risk) => (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }} onClick={(e) => e.stopPropagation()}>
          {canEdit && (
            <IconButton size="small" onClick={() => onEdit(risk)}>
              <Edit fontSize="small" />
            </IconButton>
          )}
          <IconButton size="small" onClick={() => onView(risk)}>
            <Visibility fontSize="small" />
          </IconButton>
          {canDeletePerm && (
            <IconButton size="small" onClick={() => onDelete(risk.id)}>
              <Delete fontSize="small" />
            </IconButton>
          )}
        </Box>
      ),
    },
  ];
}
