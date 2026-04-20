import { format } from 'date-fns';
import { Edit, Delete, Visibility, Send, FiberManualRecord } from '@mui/icons-material';
import { Box, Typography, IconButton, Tooltip } from '@mui/material';

const getRiskColor = (risk) => {
  const map = {
    BAIXO: ['#10b981', '#34d399'],
    MEDIO: ['#f59e0b', '#fbbf24'],
    ALTO: ['#ef4444', '#f87171'],
    CRITICO: ['#ef4444', '#f87171'],
  };
  return map[risk] || ['#6b7280', '#9ca3af'];
};

const getRiskBgColor = (risk) => {
  const map = {
    BAIXO: 'rgba(16, 185, 129, 0.15)',
    MEDIO: 'rgba(245, 158, 11, 0.15)',
    ALTO: 'rgba(239, 68, 68, 0.15)',
    CRITICO: 'rgba(239, 68, 68, 0.15)',
  };
  return map[risk] || 'rgba(107, 114, 128, 0.15)';
};

const getImpactConfig = (impact) => {
  const config = {
    MENOR: { width: '30%', gradient: 'linear-gradient(90deg, #10b981, #34d399)', label: 'Baixo' },
    SIGNIFICATIVO: { width: '60%', gradient: 'linear-gradient(90deg, #f59e0b, #fbbf24)', label: 'Médio' },
    MAIOR: { width: '90%', gradient: 'linear-gradient(90deg, #ef4444, #f87171)', label: 'Alto' },
  };
  return config[impact] || { width: '50%', gradient: 'linear-gradient(90deg, #6b7280, #9ca3af)', label: impact };
};

const getStatusConfig = (status) => {
  const config = {
    DRAFT: { color: '#9ca3af', bg: 'rgba(156, 163, 175, 0.15)', label: 'Rascunho' },
    PENDING_APPROVAL: { color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.15)', label: 'Pendente' },
    APPROVED: { color: '#34d399', bg: 'rgba(52, 211, 153, 0.15)', label: 'Aprovada' },
    APPROVED_WAITING_EXECUTION: { color: '#34d399', bg: 'rgba(52, 211, 153, 0.15)', label: 'Aprovada' },
    EXECUTED: { color: '#60a5fa', bg: 'rgba(96, 165, 250, 0.15)', label: 'Executada' },
    COMPLETED: { color: '#a78bfa', bg: 'rgba(167, 139, 250, 0.15)', label: 'Concluída' },
    REJECTED: { color: '#f87171', bg: 'rgba(248, 113, 113, 0.15)', label: 'Rejeitada' },
    FAILED: { color: '#f87171', bg: 'rgba(248, 113, 113, 0.15)', label: 'Falha' },
    CANCELLED: { color: '#f87171', bg: 'rgba(248, 113, 113, 0.15)', label: 'Cancelada' },
  };
  return config[status] || { color: '#9ca3af', bg: 'rgba(156, 163, 175, 0.15)', label: status };
};

const getTypeLabel = (type) => {
  const labels = {
    NORMAL: 'Planejada',
    PADRAO: 'Padrão',
    EMERGENCIAL: 'Emergencial',
  };
  return labels[type] || type;
};

/**
 * Pílula prioridade/status — uma linha, sem wrap.
 * Não usar `maxWidth: '100%'` numa célula estreita: o fundo ficava mais estreito que o texto.
 */
const compactPillSx = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 0.5,
  px: 1,
  py: 0.25,
  borderRadius: '6px',
  whiteSpace: 'nowrap',
  width: 'max-content',
  flexShrink: 0,
};

/**
 * Colunas DataListTable — lista de GMUDs.
 */
export function getChangeRequestColumns({ isDark, onEdit, onDelete, onView, onSend }) {
  const codeColor = isDark ? '#667eea' : undefined;
  const textMuted = isDark ? '#94a3b8' : '#64748b';

  return [
    {
      id: 'code',
      label: 'GMUD',
      width: '10%',
      minWidth: 100,
      accessor: (r) => r.code || '',
      cellSx: () => ({
        maxWidth: 160,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }),
      render: (gmud) => (
        <Typography
          component="span"
          fontWeight={600}
          fontFamily="monospace"
          noWrap
          title={gmud.code}
          sx={{ color: codeColor ?? 'text.secondary', fontSize: '0.65rem', display: 'block' }}
        >
          {gmud.code}
        </Typography>
      ),
    },
    {
      id: 'title',
      label: 'Título',
      width: '18%',
      minWidth: 140,
      accessor: (r) => r.title || '',
      cellSx: () => ({
        maxWidth: 280,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }),
      render: (gmud) => (
        <Typography
          noWrap
          title={gmud.title}
          fontWeight={600}
          sx={{ fontSize: '0.65rem', color: isDark ? '#e0e0e0' : '#1e293b' }}
        >
          {gmud.title}
        </Typography>
      ),
    },
    {
      id: 'type',
      label: 'Tipo',
      accessor: (r) => r.type || '',
      cellSx: () => ({ overflow: 'hidden', maxWidth: 120 }),
      render: (gmud) => (
        <Typography
          noWrap
          title={getTypeLabel(gmud.type)}
          fontWeight={500}
          sx={{ fontSize: '0.65rem', color: isDark ? '#e0e0e0' : '#475569' }}
        >
          {getTypeLabel(gmud.type)}
        </Typography>
      ),
    },
    {
      id: 'riskLevel',
      label: 'Prioridade',
      minWidth: 92,
      accessor: (r) => r.riskLevel || '',
      verticalAlign: 'middle',
      /** Preset compact: `tbody td { overflow: hidden }` corta bordas dos chips (especificidade > sx). */
      cellSx: () => ({
        overflow: 'visible !important',
        py: 1,
      }),
      render: (gmud) => {
        const riskColors = getRiskColor(gmud.riskLevel);
        const label =
          gmud.riskLevel === 'CRITICO'
            ? 'Crítica'
            : gmud.riskLevel === 'ALTO'
              ? 'Alta'
              : gmud.riskLevel === 'MEDIO'
                ? 'Média'
                : gmud.riskLevel === 'BAIXO'
                  ? 'Baixa'
                  : gmud.riskLevel;
        return (
          <Box
            sx={{
              ...compactPillSx,
              bgcolor: getRiskBgColor(gmud.riskLevel),
              color: riskColors[1],
            }}
          >
            <FiberManualRecord sx={{ fontSize: 7, flexShrink: 0 }} />
            <Typography fontWeight={500} sx={{ fontSize: '0.6rem', lineHeight: 1.2, flexShrink: 0 }}>
              {label}
            </Typography>
          </Box>
        );
      },
    },
    {
      id: 'statusSort',
      label: 'Status',
      minWidth: 112,
      accessor: (r) => r.status || '',
      verticalAlign: 'middle',
      cellSx: () => ({
        overflow: 'visible !important',
        py: 1,
      }),
      render: (gmud) => {
        const statusConfig = getStatusConfig(gmud.status);
        return (
          <Box
            sx={{
              ...compactPillSx,
              bgcolor: statusConfig.bg,
              color: statusConfig.color,
            }}
          >
            <FiberManualRecord sx={{ fontSize: 7, flexShrink: 0 }} />
            <Typography fontWeight={500} sx={{ fontSize: '0.6rem', lineHeight: 1.2, flexShrink: 0 }}>
              {statusConfig.label}
            </Typography>
          </Box>
        );
      },
    },
    {
      id: 'requesterName',
      label: 'Resp.',
      accessor: (r) => r.requester?.name || '',
      cellSx: () => ({ maxWidth: 120, overflow: 'hidden' }),
      render: (gmud) => {
        const name = gmud.requester?.name?.split(' ')[0] || 'Desconhecido';
        const full = gmud.requester?.name || '';
        return (
          <Typography
            noWrap
            title={full || undefined}
            fontWeight={500}
            sx={{ fontSize: '0.65rem', color: isDark ? '#e0e0e0' : '#334155' }}
          >
            {name}
          </Typography>
        );
      },
    },
    {
      id: 'scheduledStart',
      label: 'Execução',
      accessor: (r) => (r.scheduledStart ? new Date(r.scheduledStart).getTime() : null),
      cellSx: () => ({ whiteSpace: 'nowrap' }),
      render: (gmud) => (
        <Typography noWrap sx={{ fontSize: '0.65rem', color: isDark ? '#e0e0e0' : textMuted }}>
          {gmud.scheduledStart ? format(new Date(gmud.scheduledStart), 'dd/MM/yyyy HH:mm') : '-'}
        </Typography>
      ),
    },
    {
      id: 'impactSort',
      label: 'Impacto',
      accessor: (r) => r.impact || '',
      render: (gmud) => {
        const impactConfig = getImpactConfig(gmud.impact);
        return (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.75,
              minWidth: 0,
              maxWidth: '100%',
            }}
          >
            <Typography
              noWrap
              sx={{ fontSize: 10, color: isDark ? '#9ca3af' : '#64748b', flexShrink: 0, maxWidth: 56 }}
            >
              {impactConfig.label}
            </Typography>
            <Box
              sx={{
                flex: 1,
                minWidth: 48,
                maxWidth: 88,
                height: 4,
                bgcolor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
                borderRadius: '4px',
                overflow: 'hidden',
              }}
            >
              <Box
                sx={{
                  width: impactConfig.width,
                  height: '100%',
                  background: impactConfig.gradient,
                  borderRadius: '4px',
                  transition: 'width 0.3s ease',
                }}
              />
            </Box>
          </Box>
        );
      },
    },
    {
      id: 'actions',
      label: 'Ações',
      align: 'right',
      sortable: false,
      width: 160,
      minWidth: 140,
      render: (gmud) => (
        <Box
          sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}
          onClick={(e) => e.stopPropagation()}
        >
          <Tooltip title="Visualizar">
            <IconButton
              size="small"
              aria-label="Visualizar GMUD"
              onClick={() => onView(gmud)}
              sx={{
                width: 32,
                height: 32,
                borderRadius: '8px',
                bgcolor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
                color: '#9ca3af',
                '&:hover': {
                  color: '#667eea',
                  bgcolor: isDark ? 'rgba(102, 126, 234, 0.2)' : '#eff6ff',
                },
              }}
            >
              <Visibility fontSize="small" />
            </IconButton>
          </Tooltip>
          {(gmud.status === 'DRAFT' || gmud.status === 'REVISION_REQUESTED') && (
            <>
              <Tooltip title="Editar">
                <IconButton
                  size="small"
                  aria-label="Editar GMUD"
                  onClick={() => onEdit(gmud)}
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: '8px',
                    bgcolor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
                    color: '#9ca3af',
                    '&:hover': {
                      color: '#667eea',
                      bgcolor: isDark ? 'rgba(102, 126, 234, 0.2)' : '#eff6ff',
                    },
                  }}
                >
                  <Edit fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Enviar para Aprovação">
                <IconButton
                  size="small"
                  aria-label="Enviar GMUD para aprovação"
                  onClick={() => onSend(gmud)}
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: '8px',
                    bgcolor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
                    color: '#9ca3af',
                    '&:hover': {
                      color: '#10b981',
                      bgcolor: isDark ? 'rgba(16, 185, 129, 0.2)' : '#ecfdf5',
                    },
                  }}
                >
                  <Send fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Excluir">
                <IconButton
                  size="small"
                  aria-label="Excluir GMUD"
                  onClick={() => onDelete(gmud.id)}
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: '8px',
                    bgcolor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
                    color: '#9ca3af',
                    '&:hover': {
                      color: '#ef4444',
                      bgcolor: isDark ? 'rgba(239, 68, 68, 0.2)' : '#fef2f2',
                    },
                  }}
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
