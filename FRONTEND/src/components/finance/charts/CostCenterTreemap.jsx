import { Box, Typography, Paper, Tooltip } from '@mui/material';

const CostCenterTreemap = ({ data }) => {
    if (!data || data.length === 0) return null;

    // Treemap Logic (Simplified Flexbox Wrap)
    // Area = Budget (Relevance)
    // Color = Deviation (Risk)

    // Sort by Budget Descending
    const sortedData = [...data].sort((a, b) => b.budget - a.budget);
    const totalBudget = sortedData.reduce((acc, curr) => acc + curr.budget, 0);

    const getDeviationColor = (deviation) => {
        // Deviation > 0 means over budget (Bad -> Red)
        // Deviation < 0 means under budget (Good -> Green)
        // deviation is percentage, e.g., 10, -5, 50.

        if (deviation > 20) return '#ef4444'; // Critico
        if (deviation > 5) return '#f59e0b'; // Alerta
        if (deviation >= -5 && deviation <= 5) return '#3b82f6'; // On Track
        return '#22c55e'; // Saving
    };

    const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: "compact" }).format(val);

    return (
        <Paper elevation={0} variant="outlined" sx={{ p: 2, borderRadius: 4, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Box sx={{ width: 32, height: 32, borderRadius: 2, bgcolor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🔲</Box>
                <Typography variant="h6" fontWeight={700} color="text.primary">Hierarquia de Risco (Fornecedores)</Typography>
            </Box>

            <Box sx={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5, alignContent: 'flex-start', overflow: 'hidden' }}>
                {sortedData.map((item, i) => {
                    const percentage = (item.budget / totalBudget) * 100;
                    // Min width for visibility
                    const width = `${Math.max(percentage, 5)}%`;
                    const height = percentage > 20 ? 120 : 60; // Taller for bigger items
                    const color = getDeviationColor(item.deviation);

                    return (
                        <Tooltip key={item.id} title={`${item.name} | Budget: ${formatCurrency(item.budget)} | Desvio: ${item.deviation.toFixed(1)}%`} arrow>
                            <Box
                                sx={{
                                    flexGrow: 1,
                                    width: width,
                                    height: height,
                                    minWidth: '80px',
                                    bgcolor: color,
                                    borderRadius: 2,
                                    p: 1,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    color: 'white',
                                    transition: 'transform 0.2s',
                                    '&:hover': { transform: 'scale(0.98)', opacity: 0.9 },
                                    cursor: 'default'
                                }}
                            >
                                <Typography variant="caption" fontWeight={700} align="center" sx={{ lineHeight: 1.1 }}>
                                    {percentage > 5 ? item.name : ''}
                                </Typography>
                                {percentage > 10 && (
                                    <Typography variant="caption" sx={{ opacity: 0.9 }}>
                                        {formatCurrency(item.budget)}
                                    </Typography>
                                )}
                            </Box>
                        </Tooltip>
                    );
                })}
            </Box>
            <Box sx={{ mt: 1, display: 'flex', gap: 2, justifyContent: 'center' }}>
                <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#22c55e' }} /> Abaixo do Orçado</Typography>
                <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#3b82f6' }} /> Na Meta (+/- 5%)</Typography>
                <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#f59e0b' }} /> Investigue (&gt; 5%)</Typography>
                <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#ef4444' }} /> Crítico (&gt; 20%)</Typography>
            </Box>
        </Paper>
    );
};

export default CostCenterTreemap;
