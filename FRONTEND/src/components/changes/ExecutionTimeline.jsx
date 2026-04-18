import React, { useMemo } from 'react';

/**
 * ExecutionTimeline - Visual timeline comparing planned vs actual execution
 */
const ExecutionTimeline = ({
    scheduledStart,
    scheduledEnd,
    actualStart,
    actualEnd,
    status
}) => {
    const {
        plannedWidth,
        actualWidth,
        actualOffset,
        deviation,
        deviationColor,
        deviationLabel
    } = useMemo(() => {
        const planned = {
            start: new Date(scheduledStart),
            end: new Date(scheduledEnd)
        };

        const plannedDuration = planned.end - planned.start;

        // If no actual times, show only planned
        if (!actualStart) {
            return {
                plannedWidth: 100,
                actualWidth: 0,
                actualOffset: 0,
                deviation: 0,
                deviationColor: '#64748b',
                deviationLabel: 'Aguardando execução'
            };
        }

        const actual = {
            start: new Date(actualStart),
            end: actualEnd ? new Date(actualEnd) : new Date()
        };

        const actualDuration = actual.end - actual.start;

        // Calculate deviation in percentage
        const startDeviation = (actual.start - planned.start) / plannedDuration * 100;
        const durationDeviation = ((actualDuration - plannedDuration) / plannedDuration) * 100;

        // Determine status
        let color = '#10b981'; // Green - on time
        let label = 'No prazo';

        if (status === 'FAILED') {
            color = '#ef4444';
            label = 'Falhou';
        } else if (durationDeviation > 50) {
            color = '#ef4444';
            label = `+${Math.round(durationDeviation)}% do tempo`;
        } else if (durationDeviation > 20) {
            color = '#f59e0b';
            label = `+${Math.round(durationDeviation)}% do tempo`;
        } else if (durationDeviation > 0) {
            color = '#fbbf24';
            label = `+${Math.round(durationDeviation)}% do tempo`;
        } else if (durationDeviation < -10) {
            color = '#10b981';
            label = `${Math.round(Math.abs(durationDeviation))}% mais rápido`;
        }

        return {
            plannedWidth: 100,
            actualWidth: Math.min(150, Math.max(10, (actualDuration / plannedDuration) * 100)),
            actualOffset: Math.max(0, Math.min(50, startDeviation)),
            deviation: durationDeviation,
            deviationColor: color,
            deviationLabel: label
        };
    }, [scheduledStart, scheduledEnd, actualStart, actualEnd, status]);

    const formatDate = (dateStr) => {
        if (!dateStr) return '--';
        const date = new Date(dateStr);
        return date.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatDuration = (start, end) => {
        if (!start || !end) return '--';
        const diff = new Date(end) - new Date(start);
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

        if (hours > 0) {
            return `${hours}h ${minutes}min`;
        }
        return `${minutes}min`;
    };

    return (
        <div className="execution-timeline" style={{ padding: '20px 0' }}>
            {/* Legend */}
            <div style={{
                display: 'flex',
                gap: 20,
                marginBottom: 16,
                fontSize: 12
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{
                        width: 12,
                        height: 12,
                        borderRadius: '8px',
                        background: 'linear-gradient(90deg, #3b82f6, #60a5fa)'
                    }} />
                    <span style={{ color: '#94a3b8' }}>Planejado</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{
                        width: 12,
                        height: 12,
                        borderRadius: '8px',
                        background: `linear-gradient(90deg, ${deviationColor}, ${deviationColor}aa)`
                    }} />
                    <span style={{ color: '#94a3b8' }}>Real</span>
                </div>
            </div>

            {/* Timeline Track */}
            <div style={{
                position: 'relative',
                height: 40,
                marginBottom: 12
            }}>
                {/* Planned Bar */}
                <div style={{
                    position: 'absolute',
                    top: 12,
                    left: 0,
                    width: `${plannedWidth}%`,
                    height: 16,
                    background: 'linear-gradient(90deg, #3b82f6, #60a5fa)',
                    borderRadius: '8px',
                    opacity: 0.4
                }} />

                {/* Actual Bar */}
                {actualWidth > 0 && (
                    <div style={{
                        position: 'absolute',
                        top: 8,
                        left: `${actualOffset}%`,
                        width: `${actualWidth}%`,
                        height: 24,
                        background: `linear-gradient(90deg, ${deviationColor}, ${deviationColor}cc)`,
                        borderRadius: '8px',
                        boxShadow: `0 4px 12px ${deviationColor}40`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.5s ease'
                    }}>
                        <span style={{
                            fontSize: 10,
                            fontWeight: 600,
                            color: 'white',
                            textShadow: '0 1px 2px rgba(0,0,0,0.3)'
                        }}>
                            {formatDuration(actualStart, actualEnd || new Date())}
                        </span>
                    </div>
                )}
            </div>

            {/* Labels */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 16,
                fontSize: 11
            }}>
                <div>
                    <div style={{ color: '#64748b', marginBottom: 4 }}>Planejado</div>
                    <div style={{ color: '#60a5fa', fontWeight: 500 }}>
                        {formatDate(scheduledStart)} → {formatDate(scheduledEnd)}
                    </div>
                    <div style={{ color: '#94a3b8', marginTop: 2 }}>
                        Duração: {formatDuration(scheduledStart, scheduledEnd)}
                    </div>
                </div>
                <div>
                    <div style={{ color: '#64748b', marginBottom: 4 }}>Real</div>
                    <div style={{ color: deviationColor, fontWeight: 500 }}>
                        {formatDate(actualStart)} → {actualEnd ? formatDate(actualEnd) : 'Em andamento...'}
                    </div>
                    <div style={{ color: '#94a3b8', marginTop: 2 }}>
                        {deviationLabel}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ExecutionTimeline;
