/**
 * Colunas `DataListTable` (modo servidor) — lista de projetos.
 * IDs alinham a `sortBy` da API: `name`, `status`, `priority`, `manager`, `techLead`, `progress`, `endDate`.
 * Escala visual alinhada à lista de incidentes (Chip small ~21px, tipografia rem).
 */
import { Box, Typography, Chip, Avatar } from '@mui/material';

/** Mesma intenção que incidentes: chips densos e legíveis */
const chipDenseSx = {
    height: 21,
    fontWeight: 600,
    fontSize: '0.525rem',
    '& .MuiChip-label': { px: 0.75, lineHeight: 1.2, whiteSpace: 'nowrap' },
    '& .MuiChip-icon': { color: 'inherit', ml: 0, mr: -0.25 },
    '& .MuiChip-icon .material-icons-round': { fontSize: '10px' },
};

export function getProjectListColumns({
  navigate,
  canWrite,
  canDeletePerm,
  getStatusConfig,
  getApprovalStatusConfig,
  getPriorityConfig,
  getProgressClass,
  getDaysRemaining,
  formatDate,
  onResubmit,
  onOpenEdit,
  onDelete,
}) {
  return [
    {
      id: 'name',
      label: 'Projeto',
      width: '20%',
      minWidth: 200,
      accessor: (p) => p.name || '',
      cellSx: () => ({
        verticalAlign: 'middle',
        wordBreak: 'break-word',
        overflowWrap: 'anywhere',
      }),
      render: (project) => (
        <Box className="pl-project-info" sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, minWidth: 0 }}>
          <Typography sx={{ color: 'text.primary', fontSize: '0.7rem', fontWeight: 600, lineHeight: 1.3 }}>
            {project.name}
          </Typography>
          {project.code ? (
            <Typography
              component="span"
              sx={{
                color: 'text.secondary',
                fontSize: '0.64rem',
                fontFamily: 'ui-monospace, monospace',
                bgcolor: 'action.hover',
                px: 0.75,
                py: 0.125,
                borderRadius: 1,
                width: 'fit-content',
              }}
            >
              {project.code}
            </Typography>
          ) : null}
        </Box>
      ),
    },
    {
      id: 'status',
      label: 'Status',
      accessor: (p) => p.status || '',
      width: '9%',
      minWidth: 152,
      cellSx: () => ({
        verticalAlign: 'middle',
        whiteSpace: 'nowrap',
        wordBreak: 'normal',
        overflowWrap: 'normal',
      }),
      render: (project) => {
        const isApproved = project.approvalStatus === 'APPROVED';
        const approvalConfig = getApprovalStatusConfig(project.approvalStatus, project.requiresAdjustment);
        const statusConfig = getStatusConfig(project.status);
        if (!isApproved) {
          return (
            <Box sx={{ display: 'flex', justifyContent: 'flex-start', width: '100%', minWidth: 0 }}>
              <Chip
                size="small"
                label={approvalConfig.label}
                icon={<span className="material-icons-round">{approvalConfig.icon}</span>}
                sx={{
                  ...chipDenseSx,
                  maxWidth: '100%',
                  bgcolor: `${approvalConfig.color}22`,
                  color: approvalConfig.color,
                  border: `1px solid ${approvalConfig.color}44`,
                }}
              />
            </Box>
          );
        }
        return (
          <Box sx={{ display: 'flex', justifyContent: 'flex-start', width: '100%', minWidth: 0 }}>
            <Chip
              size="small"
              label={statusConfig.label}
              icon={<span className="material-icons-round">{statusConfig.icon}</span>}
              className={statusConfig.className}
              sx={{
                ...chipDenseSx,
                maxWidth: '100%',
                '&.pl-status-planning': {
                  bgcolor: 'var(--pl-accent-cyan-soft)',
                  color: 'var(--pl-accent-cyan)',
                  border: '1px solid rgba(6, 182, 212, 0.2)',
                },
                '&.pl-status-execution': {
                  bgcolor: 'var(--pl-accent-amber-soft)',
                  color: 'var(--pl-accent-amber)',
                  border: '1px solid rgba(245, 158, 11, 0.2)',
                },
                '&.pl-status-completed': {
                  bgcolor: 'var(--pl-accent-emerald-soft)',
                  color: 'var(--pl-accent-emerald)',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                },
                '&.pl-status-paused': {
                  bgcolor: 'var(--pl-accent-rose-soft)',
                  color: 'var(--pl-accent-rose)',
                  border: '1px solid rgba(244, 63, 94, 0.2)',
                },
              }}
            />
          </Box>
        );
      },
    },
    {
      id: 'priority',
      label: 'Prioridade',
      width: '8%',
      minWidth: 100,
      accessor: (p) => p.priority || '',
      cellSx: () => ({
        verticalAlign: 'middle',
        whiteSpace: 'nowrap',
        wordBreak: 'normal',
        overflowWrap: 'normal',
      }),
      render: (project) => {
        const cfg = getPriorityConfig(project.priority);
        return (
          <Box sx={{ display: 'flex', justifyContent: 'flex-start', width: '100%' }}>
            <Chip
              size="small"
              label={cfg.label}
              icon={<span className="material-icons-round">{cfg.icon}</span>}
              className={cfg.className}
              sx={{
                ...chipDenseSx,
                '&.pl-priority-low': {
                  bgcolor: 'rgba(148, 163, 184, 0.12)',
                  color: 'var(--pl-text-secondary)',
                  border: '1px solid rgba(148, 163, 184, 0.2)',
                },
                '&.pl-priority-medium': {
                  bgcolor: 'rgba(6, 182, 212, 0.1)',
                  color: 'var(--pl-accent-cyan)',
                  border: '1px solid rgba(6, 182, 212, 0.2)',
                },
                '&.pl-priority-high': {
                  bgcolor: 'rgba(245, 158, 11, 0.1)',
                  color: 'var(--pl-accent-amber)',
                  border: '1px solid rgba(245, 158, 11, 0.2)',
                },
                '&.pl-priority-critical': {
                  bgcolor: 'rgba(244, 63, 94, 0.1)',
                  color: 'var(--pl-accent-rose)',
                  border: '1px solid rgba(244, 63, 94, 0.2)',
                },
              }}
            />
          </Box>
        );
      },
    },
    {
      id: 'manager',
      label: 'Gerente',
      width: '12%',
      minWidth: 140,
      accessor: (p) => p.manager?.name || '',
      render: (project) => {
        if (!project.manager) {
          return <span style={{ color: 'var(--pl-text-muted)' }}>-</span>;
        }
        const managerName = project.manager.name || '';
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
            <Avatar sx={{ width: 18, height: 18, fontSize: '0.5rem', bgcolor: '#2563eb' }}>
              {managerName?.[0]}
            </Avatar>
            <Typography sx={{ color: 'text.primary', fontSize: '0.6rem', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {managerName}
            </Typography>
          </Box>
        );
      },
    },
    {
      id: 'techLead',
      label: 'Tech Lead',
      width: '12%',
      minWidth: 140,
      accessor: (p) => p.techLead?.name || '',
      render: (project) => {
        if (!project.techLead) {
          return <span style={{ color: 'var(--pl-text-muted)' }}>-</span>;
        }
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
            <Avatar sx={{ width: 18, height: 18, fontSize: '0.5rem', bgcolor: '#2563eb' }}>
              {project.techLead.name?.[0]}
            </Avatar>
            <Typography sx={{ color: 'text.primary', fontSize: '0.6rem', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {project.techLead.name}
            </Typography>
          </Box>
        );
      },
    },
    {
      id: 'progress',
      label: 'Progresso',
      align: 'right',
      width: '11%',
      minWidth: 108,
      accessor: (p) => Number(p.progress) || 0,
      cellSx: () => ({
        verticalAlign: 'middle',
        whiteSpace: 'nowrap',
        wordBreak: 'normal',
        overflowWrap: 'normal',
      }),
      render: (project) => {
        const v = project.progress || 0;
        const progressClass = getProgressClass(v);
        return (
          <div className="pl-progress-cell">
            <div className="pl-progress-bar-container">
              <div className={`pl-progress-bar ${progressClass}`} style={{ width: `${v}%` }} />
            </div>
            <span className="pl-progress-value">{v}%</span>
          </div>
        );
      },
    },
    {
      id: 'endDate',
      label: 'Cronograma',
      minWidth: 210,
      accessor: (p) => (p.endDate ? new Date(p.endDate).getTime() : 0),
      render: (project) => {
        const daysInfo = getDaysRemaining(project.endDate, project.status);
        return (
          <div className="pl-timeline-cell">
            <div className="pl-timeline-dates">
              <span className="material-icons-round">calendar_today</span>
              {formatDate(project.startDate)} → {formatDate(project.endDate)}
            </div>
            <span className={`pl-timeline-remaining ${daysInfo.className}`}>{daysInfo.text}</span>
          </div>
        );
      },
    },
    {
      id: 'actions',
      label: 'Ações',
      sortable: false,
      width: '13%',
      minWidth: 136,
      align: 'right',
      cellSx: () => ({
        verticalAlign: 'middle',
        whiteSpace: 'nowrap',
        wordBreak: 'normal',
        overflowWrap: 'normal',
      }),
      render: (project) => {
        const isReturnedForAdjustment = project.approvalStatus === 'DRAFT' && project.requiresAdjustment;
        const isPermanentlyRejected = project.approvalStatus === 'REJECTED' && !project.requiresAdjustment;
        const canEditProject = canWrite && !isPermanentlyRejected;
        const canDeleteProject = canDeletePerm && !isPermanentlyRejected;
        return (
          <div className="pl-actions-cell" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="pl-action-btn view"
              title="Visualizar"
              onClick={() => navigate(`/projects/${project.id}`)}
            >
              <span className="material-icons-round">visibility</span>
            </button>
            {isReturnedForAdjustment && (
              <button
                type="button"
                className="pl-action-btn"
                title="Reenviar para Aprovação"
                onClick={(e) => onResubmit(e, project.id)}
                style={{
                  background: 'rgba(16, 185, 129, 0.15)',
                  color: '#10b981',
                  border: 'none',
                  borderRadius: 6,
                  width: 28,
                  height: 28,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span className="material-icons-round" style={{ fontSize: '1.125rem' }}>send</span>
              </button>
            )}
            {canWrite && (
              <button
                type="button"
                className="pl-action-btn edit"
                title={isPermanentlyRejected ? 'Projeto rejeitado (somente leitura)' : 'Editar'}
                disabled={!canEditProject}
                onClick={(e) => canEditProject && onOpenEdit(e, project)}
                style={{ opacity: canEditProject ? 1 : 0.4 }}
              >
                <span className="material-icons-round">edit</span>
              </button>
            )}
            {canDeletePerm && (
              <button
                type="button"
                className="pl-action-btn delete"
                title={isPermanentlyRejected ? 'Projeto rejeitado (somente leitura)' : 'Excluir'}
                disabled={!canDeleteProject}
                onClick={(e) => canDeleteProject && onDelete(e, project.id)}
                style={{ opacity: canDeleteProject ? 1 : 0.4 }}
              >
                <span className="material-icons-round">delete</span>
              </button>
            )}
          </div>
        );
      },
    },
  ];
}
