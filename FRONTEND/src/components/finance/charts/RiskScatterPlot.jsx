import { Box, Typography, Paper } from '@mui/material';
import { ScatterChart } from '@mui/x-charts/ScatterChart';

const RiskScatterPlot = ({ data }) => {
    if (!data || data.length === 0) return null;

    // Scatter Data
    // X: Budget (Magnitude)
    // Y: Deviation (Risk)
    // ID: Name

    // MUI Charts Series Format: { data: [{ x, y, id }] }
    const seriesData = data.map((d, i) => ({
        x: d.budget,
        y: d.deviation,
        id: i,
        label: d.name,
        color: d.deviation > 20 ? '#ef4444' : '#3b82f6'
    }));

    return (
        <Paper elevation={0} variant="outlined" sx={{ p: 2, borderRadius: 4, height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Box sx={{ width: 32, height: 32, borderRadius: 2, bgcolor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🎯</Box>
                <Typography variant="h6" fontWeight={700} color="text.primary">Matriz de Risco (Impacto x Desvio)</Typography>
            </Box>

            <Box sx={{ height: 300, width: '100%' }}>
                <ScatterChart
                    series={[{
                        data: seriesData,
                        valueFormatter: (v) => v.label
                    }]}
                    xAxis={[{ label: 'Orçamento Total (R$)', min: 0 }]}
                    yAxis={[{ label: 'Desvio (%)' }]}
                    height={300}
                    margin={{ top: 10, bottom: 50, left: 50, right: 10 }}
                    tooltip={{ trigger: 'item' }}
                />
            </Box>
        </Paper>
    );
};

export default RiskScatterPlot;
