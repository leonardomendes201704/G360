import React, { useContext } from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { ThemeContext } from '../../contexts/ThemeContext';

const RiskHeatmap = ({ data }) => {
    const { mode } = useContext(ThemeContext);
    const isDark = mode === 'dark';

    // Matrix Config
    const matrixSize = 5;
    const labelsProb = ['Muito Baixa', 'Baixa', 'Média', 'Alta', 'Muito Alta'];
    const labelsImpact = ['Baixo', 'Médio', 'Alto', 'Crítico']; // Impact usually 4 or 5 levels. Prisma has 4: BAIXO, MEDIO, ALTO, CRITICO. But code has 5?
    // Checking schema: Impact: BAIXO, MEDIO, ALTO, CRITICO (4 levels). Probability: BAIXA, MEDIA, ALTA, MUITO_ALTA (4 levels).
    // Wait, in my service logic I mapped 5 levels.
    // Schema: 
    // probability   String    // BAIXA, MEDIA, ALTA, MUITO_ALTA (4)
    // impact        String    // BAIXO, MEDIO, ALTO, CRITICO (4)

    // Let's stick to 4x4 or 5x5 depending on business rules.
    // Previous ProjectRisks.jsx had 5x5 logic?
    // "MUITO_BAIXA" was mapped to 1. "CRITICO" mapped to 5.
    // My schema comments said:
    // probability   String    // BAIXA, MEDIA, ALTA, MUITO_ALTA
    // impact        String    // BAIXO, MEDIO, ALTO, CRITICO

    // Let's support 5x5 visually but mapped to these values.

    const getSeverityColor = (row, col) => {
        // row = impact (y), col = probability (x)
        // Score = row * col
        const score = row * col;
        if (score >= 16) return '#dc2626'; // Critical
        if (score >= 10) return '#f97316'; // High
        if (score >= 6) return '#f59e0b'; // Medium
        return '#10b981'; // Low
    };

    // Transform data to matrix
    // Data comes as [{ probability: 'ALTA', impact: 'MEDIO', _count: { id: 10 } }]
    const processData = () => {
        const matrix = Array(5).fill(0).map(() => Array(5).fill(0));

        const mapProb = { 'MUITO_BAIXA': 1, 'BAIXA': 2, 'MEDIA': 3, 'ALTA': 4, 'MUITO_ALTA': 5 };
        // Impact
        const mapImp = { 'MUITO_BAIXO': 1, 'BAIXO': 2, 'MEDIO': 3, 'ALTO': 4, 'CRITICO': 5 };

        if (!data) return matrix;

        data.forEach(item => {
            const p = mapProb[item.probability] || 0;
            const i = mapImp[item.impact] || 0;
            if (p > 0 && i > 0) {
                // matrix[row][col] -> we want Y to be Impact, X to be Probability
                // Usually Heatmap: Y axis (Impact) 5 (Top) to 1 (Bottom). X axis 1 (Left) to 5 (Right).
                // Array index: 0 is top. So we map Impact 5 to index 0.
                matrix[5 - i][p - 1] = item._count.id;
            }
        });
        return matrix;
    };

    const matrix = processData();

    return (
        <Paper sx={{
            p: 3,
            borderRadius: '16px',
            background: isDark ? 'linear-gradient(145deg, #1a222d 0%, #151c25 100%)' : '#FFFFFF',
            border: isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid rgba(0, 0, 0, 0.08)'
        }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>Matriz de Calor</Typography>

            <Box sx={{ display: 'flex' }}>
                {/* Y Axis Label */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', writingMode: 'vertical-rl', transform: 'rotate(180deg)', mr: 2 }}>
                    <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>IMPACTO</Typography>
                </Box>

                <Box sx={{ flex: 1, maxWidth: 450 }}>
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 0.75 }}>
                        {matrix.map((row, rIdx) => (
                            row.map((count, cIdx) => {
                                const impact = 5 - rIdx;
                                const prob = cIdx + 1;
                                const score = impact * prob;

                                let cellColor = '#10b981'; // Green (Low)
                                if (score >= 16) cellColor = '#ef4444'; // Red (Critical)
                                else if (score >= 10) cellColor = '#f97316'; // Orange (High)
                                else if (score >= 6) cellColor = '#f59e0b'; // Yellow (Medium)

                                // Dark mode adjustments - slightly transparent but still vibrant
                                if (isDark) {
                                    if (score >= 16) cellColor = 'rgba(239, 68, 68, 0.6)';
                                    else if (score >= 10) cellColor = 'rgba(249, 115, 22, 0.6)';
                                    else if (score >= 6) cellColor = 'rgba(245, 158, 11, 0.6)';
                                    else cellColor = 'rgba(16, 185, 129, 0.6)';
                                }

                                return (
                                    <Box key={`${rIdx}-${cIdx}`} sx={{
                                        aspectRatio: '1',
                                        borderRadius: '8px',
                                        bgcolor: cellColor,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#ffffff', // White text for contrast on vibrant colors
                                        textShadow: '0 1px 2px rgba(0,0,0,0.3)', // Shadow for readability
                                        border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.05)',
                                        position: 'relative',
                                        transition: 'transform 0.2s',
                                        '&:hover': { transform: 'scale(1.05)', zIndex: 1 }
                                    }}>
                                        {count > 0 && (
                                            <Typography sx={{ fontSize: '1.25rem', fontWeight: 700, color: isDark ? '#fff' : 'rgba(0,0,0,0.8)' }}>
                                                {count}
                                            </Typography>
                                        )}
                                    </Box>
                                );
                            })
                        ))}
                    </Box>
                    {/* X Axis Label */}
                    <Box sx={{ mt: 2, textAlign: 'center' }}>
                        <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>PROBABILIDADE</Typography>
                    </Box>
                </Box>
            </Box>
        </Paper>
    );
};

export default RiskHeatmap;
