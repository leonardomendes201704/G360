import React from 'react';

/**
 * ChangeLifecycle - Visual lifecycle stepper for GMUD status journey
 * Shows: Rascunho → Aprovação → Aprovada → Em Execução → Finalizada
 */
const LIFECYCLE_STEPS = [
    { key: 'DRAFT', label: 'Rascunho', icon: '📝', statuses: ['DRAFT'] },
    { key: 'PENDING', label: 'Aprovação', icon: '⏳', statuses: ['PENDING_APPROVAL', 'REVISION_REQUESTED'] },
    { key: 'APPROVED', label: 'Aprovada', icon: '✅', statuses: ['APPROVED', 'APPROVED_WAITING_EXECUTION'] },
    { key: 'EXECUTING', label: 'Execução', icon: '🚀', statuses: ['EXECUTING'] },
    { key: 'DONE', label: 'Finalizada', icon: '🏁', statuses: ['EXECUTED', 'FAILED', 'CANCELLED'] },
];

const ChangeLifecycle = ({ status, createdAt, updatedAt }) => {
    const currentIdx = LIFECYCLE_STEPS.findIndex(s => s.statuses.includes(status));
    const isFailed = status === 'FAILED' || status === 'CANCELLED';
    const isRevision = status === 'REVISION_REQUESTED';

    const getStepColor = (idx) => {
        if (idx < currentIdx) return '#10b981'; // completed - green
        if (idx === currentIdx) {
            if (isFailed) return '#ef4444'; // failed - red
            if (isRevision) return '#f59e0b'; // revision - yellow
            return '#3b82f6'; // current - blue
        }
        return '#334155'; // future - dark gray
    };

    const getConnectorColor = (idx) => {
        if (idx < currentIdx) return '#10b981';
        return '#1e293b';
    };

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 24px',
            background: 'transparent',
            borderRadius: 12,
            border: 'none',
            margin: '16px 24px 8px',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {LIFECYCLE_STEPS.map((step, idx) => (
                <React.Fragment key={step.key}>
                    {/* Step */}
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 6,
                        position: 'relative',
                        zIndex: 1,
                        flex: '0 0 auto',
                        minWidth: 64
                    }}>
                        {/* Circle */}
                        <div style={{
                            width: 28,
                            height: 28,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: idx <= currentIdx ? 12 : 11,
                            fontWeight: 600,
                            background: idx <= currentIdx
                                ? `linear-gradient(135deg, ${getStepColor(idx)}, ${getStepColor(idx)}cc)`
                                : 'rgba(51, 65, 85, 0.5)',
                            color: idx <= currentIdx ? 'white' : '#64748b',
                            boxShadow: idx === currentIdx
                                ? `0 0 16px ${getStepColor(idx)}50, 0 0 4px ${getStepColor(idx)}30`
                                : 'none',
                            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                            border: idx === currentIdx
                                ? `2px solid ${getStepColor(idx)}80`
                                : '2px solid transparent',
                            animation: idx === currentIdx ? 'lifecyclePulse 2s ease-in-out infinite' : 'none'
                        }}>
                            {idx < currentIdx ? '✓' : step.icon}
                        </div>
                        {/* Label */}
                        <div style={{
                            fontSize: 11,
                            fontWeight: idx === currentIdx ? 700 : 500,
                            color: idx <= currentIdx ? getStepColor(idx) : '#475569',
                            textAlign: 'center',
                            letterSpacing: idx === currentIdx ? '0.3px' : '0',
                            whiteSpace: 'nowrap',
                            transition: 'all 0.3s ease'
                        }}>
                            {idx === currentIdx && isFailed ? (status === 'FAILED' ? 'Falhou' : 'Cancelada') :
                                idx === currentIdx && isRevision ? 'Revisão' :
                                    step.label}
                        </div>
                    </div>

                    {/* Connector */}
                    {idx < LIFECYCLE_STEPS.length - 1 && (
                        <div style={{
                            flex: 1,
                            height: 2,
                            background: getConnectorColor(idx),
                            margin: '0 4px',
                            marginBottom: 20,
                            borderRadius: 1,
                            transition: 'background 0.4s ease',
                            position: 'relative',
                            overflow: 'hidden'
                        }}>
                            {idx < currentIdx && (
                                <div style={{
                                    position: 'absolute',
                                    top: 0, left: 0, right: 0, bottom: 0,
                                    background: `linear-gradient(90deg, ${getConnectorColor(idx)}, ${getConnectorColor(idx)}cc)`,
                                    borderRadius: 1
                                }} />
                            )}
                        </div>
                    )}
                </React.Fragment>
            ))}

            <style>{`
                @keyframes lifecyclePulse {
                    0%, 100% { box-shadow: 0 0 8px rgba(59,130,246,0.3); }
                    50% { box-shadow: 0 0 20px rgba(59,130,246,0.5); }
                }
            `}</style>
        </div>
    );
};

export default ChangeLifecycle;
