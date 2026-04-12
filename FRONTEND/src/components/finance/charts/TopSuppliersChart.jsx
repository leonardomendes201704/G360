import { Box, Typography, Paper } from '@mui/material';
import { BarChart } from '@mui/x-charts/BarChart';

const TopSuppliersChart = ({ data }) => {
    if (!data || data.length === 0) return null;

    return (
        <Paper elevation={0} variant="outlined" sx={{ p: 2, borderRadius: 4, height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Box sx={{ width: 32, height: 32, borderRadius: 2, bgcolor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🚚</Box>
                <Typography variant="h6" fontWeight={700} color="text.primary">Top Fornecedores</Typography>
            </Box>

            <Box sx={{ height: 300, width: '100%' }}>
                <BarChart
                    dataset={data}
                    yAxis={[{ scaleType: 'band', dataKey: 'name', tickLabelStyle: { fontSize: 11, width: 100 } }]}
                    xAxis={[{ label: 'Valor Pago (R$)' }]}
                    series={[{ dataKey: 'value', label: 'Valor Pago', color: '#2563eb' }]}
                    layout="horizontal"
                    height={300}
                    margin={{ top: 0, bottom: 50, left: 100, right: 20 }}
                />
            </Box>
        </Paper>
    );
};

export default TopSuppliersChart;
