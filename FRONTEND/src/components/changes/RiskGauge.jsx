import React, { useMemo } from 'react';

/**
 * RiskGauge - Visual gauge component for risk level display
 * Shows a semi-circular gauge with animated needle
 */
const RiskGauge = ({ riskLevel, riskScore = 0 }) => {
    // Calculate needle rotation based on risk level or score
    const { rotation, color, label } = useMemo(() => {
        // Map risk levels to rotation angles (0 = left, 180 = right)
        const riskMap = {
            'BAIXO': { rotation: -60, color: '#10b981', label: 'BAIXO' },
            'MEDIO': { rotation: -20, color: '#f59e0b', label: 'MÉDIO' },
            'ALTO': { rotation: 20, color: '#f97316', label: 'ALTO' },
            'CRITICO': { rotation: 60, color: '#ef4444', label: 'CRÍTICO' }
        };

        // If we have a score, calculate from that
        if (riskScore > 0) {
            if (riskScore <= 5) return riskMap['BAIXO'];
            if (riskScore <= 10) return riskMap['MEDIO'];
            if (riskScore <= 15) return riskMap['ALTO'];
            return riskMap['CRITICO'];
        }

        return riskMap[riskLevel] || riskMap['BAIXO'];
    }, [riskLevel, riskScore]);

    return (
        <div className="risk-gauge-container">
            <div className="risk-gauge">
                {/* Background arc */}
                <svg viewBox="0 0 160 90" style={{ width: '100%', height: '100%' }}>
                    {/* Background segments */}
                    <defs>
                        <linearGradient id="lowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#10b981" />
                            <stop offset="100%" stopColor="#34d399" />
                        </linearGradient>
                        <linearGradient id="medGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#f59e0b" />
                            <stop offset="100%" stopColor="#fbbf24" />
                        </linearGradient>
                        <linearGradient id="highGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#f97316" />
                            <stop offset="100%" stopColor="#fb923c" />
                        </linearGradient>
                        <linearGradient id="critGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#ef4444" />
                            <stop offset="100%" stopColor="#f87171" />
                        </linearGradient>
                    </defs>

                    {/* Arc segments */}
                    <path
                        d="M 20 80 A 60 60 0 0 1 50 28"
                        stroke="url(#lowGrad)"
                        strokeWidth="12"
                        fill="none"
                        strokeLinecap="round"
                    />
                    <path
                        d="M 52 26 A 60 60 0 0 1 80 20"
                        stroke="url(#medGrad)"
                        strokeWidth="12"
                        fill="none"
                    />
                    <path
                        d="M 82 20 A 60 60 0 0 1 110 28"
                        stroke="url(#highGrad)"
                        strokeWidth="12"
                        fill="none"
                    />
                    <path
                        d="M 112 30 A 60 60 0 0 1 140 80"
                        stroke="url(#critGrad)"
                        strokeWidth="12"
                        fill="none"
                        strokeLinecap="round"
                    />

                    {/* Needle */}
                    <g transform={`rotate(${rotation}, 80, 80)`} style={{ transition: 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
                        <line
                            x1="80"
                            y1="80"
                            x2="80"
                            y2="30"
                            stroke="white"
                            strokeWidth="3"
                            strokeLinecap="round"
                            style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}
                        />
                    </g>

                    {/* Center pivot */}
                    <circle
                        cx="80"
                        cy="80"
                        r="8"
                        fill={color}
                        style={{
                            filter: `drop-shadow(0 0 8px ${color}50)`,
                            transition: 'fill 0.3s ease'
                        }}
                    />
                </svg>
            </div>

            {/* Risk Label */}
            <div
                className="risk-label"
                style={{
                    color,
                    textShadow: `0 0 20px ${color}40`
                }}
            >
                {label}
            </div>

            {/* Risk Score */}
            {riskScore > 0 && (
                <div style={{
                    fontSize: 11,
                    color: '#64748b',
                    marginTop: 4
                }}>
                    Score: {riskScore} pontos
                </div>
            )}
        </div>
    );
};

export default RiskGauge;
