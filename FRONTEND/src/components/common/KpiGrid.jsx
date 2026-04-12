import { Box } from '@mui/material';

/**
 * KpiGrid — Grid responsivo para exibir StatsCards lado a lado.
 *
 * @param {ReactNode} children - StatsCard components
 * @param {string}    [minWidth='140px'] - Largura minima de cada card
 * @param {number}    [gap=2] - Espacamento entre cards (MUI spacing)
 * @param {number}    [mb=4] - Margin bottom (MUI spacing)
 */
const KpiGrid = ({ children, minWidth = '140px', gap = 2, mb = 4 }) => (
    <Box
        sx={{
            display: 'grid',
            gridTemplateColumns: `repeat(auto-fill, minmax(${minWidth}, 1fr))`,
            gap,
            mb,
        }}
    >
        {children}
    </Box>
);

export default KpiGrid;
