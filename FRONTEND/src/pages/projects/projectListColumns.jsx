/**
 * Colunas `DataListTable` (modo servidor) — lista de projetos.
 * IDs alinham a `sortBy` da API: `name`, `status`, `priority`, `manager`, `techLead`, `progress`, `endDate`.
 */
export function getProjectListColumns({
  navigate,
  canWrite,
  canDeletePerm,
  getStatusConfig,
  getApprovalStatusConfig,
  getPriorityConfig,
  getProgressClass,
  getDaysRemaining,
  getAvatarGradient,
  getInitials,
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
      accessor: (p) => p.name || '',
      cellSx: () => ({ verticalAlign: 'middle' }),
      render: (project) => (
        <div className="pl-project-info">
          <span className="pl-project-name">{project.name}</span>
          <span className="pl-project-code">{project.code}</span>
        </div>
      ),
    },
    {
      id: 'status',
      label: 'Status',
      accessor: (p) => p.status || '',
      width: '9%',
      render: (project) => {
        const isApproved = project.approvalStatus === 'APPROVED';
        const isReturnedForAdjustment = project.approvalStatus === 'DRAFT' && project.requiresAdjustment;
        const approvalConfig = getApprovalStatusConfig(project.approvalStatus, project.requiresAdjustment);
        const statusConfig = getStatusConfig(project.status);
        if (!isApproved) {
          return (
            <span
              className="pl-status-badge"
              style={{
                background: `${approvalConfig.color}20`,
                color: approvalConfig.color,
                border: `1px solid ${approvalConfig.color}40`,
              }}
            >
              <span className="material-icons-round">{approvalConfig.icon}</span>
              {approvalConfig.label}
            </span>
          );
        }
        return (
          <span className={`pl-status-badge ${statusConfig.className}`}>
            <span className="material-icons-round">{statusConfig.icon}</span>
            {statusConfig.label}
          </span>
        );
      },
    },
    {
      id: 'priority',
      label: 'Prioridade',
      width: '8%',
      accessor: (p) => p.priority || '',
      render: (project) => {
        const cfg = getPriorityConfig(project.priority);
        return (
          <span className={`pl-priority-badge ${cfg.className}`}>
            <span className="material-icons-round" style={{ fontSize: 14 }}>{cfg.icon}</span>
            {cfg.label}
          </span>
        );
      },
    },
    {
      id: 'manager',
      label: 'Gerente',
      width: '12%',
      accessor: (p) => p.manager?.name || '',
      render: (project) => {
        if (!project.manager) {
          return <span style={{ color: 'var(--pl-text-muted)' }}>-</span>;
        }
        const managerName = project.manager.name || '';
        const g = getAvatarGradient(managerName);
        return (
          <div className="pl-manager-cell">
            <div className={`pl-manager-avatar ${g}`}>{getInitials(managerName)}</div>
            <span className="pl-manager-name">{managerName}</span>
          </div>
        );
      },
    },
    {
      id: 'techLead',
      label: 'Tech Lead',
      width: '12%',
      accessor: (p) => p.techLead?.name || '',
      render: (project) => {
        if (!project.techLead) {
          return <span style={{ color: 'var(--pl-text-muted)' }}>-</span>;
        }
        return (
          <div className="pl-manager-cell">
            <div className={`pl-manager-avatar ${getAvatarGradient(project.techLead.name)}`}>
              {getInitials(project.techLead.name)}
            </div>
            <span className="pl-manager-name">{project.techLead.name}</span>
          </div>
        );
      },
    },
    {
      id: 'progress',
      label: 'Progresso',
      align: 'right',
      width: '11%',
      accessor: (p) => Number(p.progress) || 0,
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
      minWidth: 200,
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
      align: 'right',
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
                  borderRadius: 8,
                  width: 32,
                  height: 32,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span className="material-icons-round" style={{ fontSize: 18 }}>send</span>
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
