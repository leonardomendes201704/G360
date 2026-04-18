import { Box, Typography, Tooltip, Paper } from '@mui/material';

const CostCenterHeatmap = ({ data }) => {
    if (!data || data.length === 0) return null;

    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

    // Find max value for color scaling
    let maxValue = 0;
    data.forEach(cc => {
        cc.months.forEach(val => {
            if (val > maxValue) maxValue = val;
        });
    });

    const getColor = (value) => {
        if (value === 0) return '#f8fafc'; // Gray 50
        const percentage = value / maxValue;
        // Simple Red Scale
        // Low: #fee2e2 (Red 100) -> High: #991b1b (Red 800)
        // Adjust alpha/lightness based on percentage
        if (percentage < 0.2) return '#fee2e2';
        if (percentage < 0.4) return '#fca5a5';
        if (percentage < 0.6) return '#f87171';
        if (percentage < 0.8) return '#ef4444';
        return '#b91c1c';
    };

    const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: "compact" }).format(val);

    return (
        <Paper elevation={0} variant="outlined" sx={{ p: 2, borderRadius: '8px', overflowX: 'auto' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Box sx={{ width: 32, height: 32, borderRadius: '8px', bgcolor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🔥</Box>
                <Typography variant="h6" fontWeight={700} color="text.primary">Sazonalidade de Despesas (Contas Contábeis)</Typography>
            </Box>

            <Box sx={{ minWidth: 800 }}>
                {/* Header Row */}
                <Box sx={{ display: 'flex', mb: 1 }}>
                    <Box sx={{ width: 150, flexShrink: 0 }} /> {/* Name Column Spacer */}
                    {months.map(m => (
                        <Box key={m} sx={{ flex: 1, textAlign: 'center' }}>
                            <Typography variant="caption" fontWeight={600} color="text.secondary">{m}</Typography>
                        </Box>
                    ))}
                    <Box sx={{ width: 80, flexShrink: 0, textAlign: 'right', pr: 1 }}>
                        <Typography variant="caption" fontWeight={600} color="text.secondary">Total</Typography>
                    </Box>
                </Box>

                {/* Data Rows */}
                {data.map(cc => (
                    <Box key={cc.id} sx={{ display: 'flex', alignItems: 'center', mb: 0.5, '&:hover': { bgcolor: '#f8fafc' }, borderRadius: '8px', transition: 'background-color 0.2s' }}>
                        <Box sx={{ width: 150, flexShrink: 0, px: 1 }}>
                            <Typography variant="body2" fontWeight={600} noWrap title={cc.name}>{cc.name}</Typography>
                            <Typography variant="caption" color="text.secondary">{cc.code}</Typography>
                        </Box>
                        {cc.months.map((val, idx) => (
                            <Tooltip key={idx} title={`${months[idx]}: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)}`} arrow>
                                <Box sx={{ flex: 1, height: 32, mx: 0.2, bgcolor: getColor(val), borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s', '&:hover': { transform: 'scale(1.05)' } }} />
                            </Tooltip>
                        ))}
                        <Box sx={{ width: 80, flexShrink: 0, textAlign: 'right', pr: 1 }}>
                            <Typography variant="caption" fontWeight={700}>{formatCurrency(cc.totalActual)}</Typography>
                        </Box>
                    </Box>
                ))}
            </Box>
        </Paper>
    );
};

export default CostCenterHeatmap;
