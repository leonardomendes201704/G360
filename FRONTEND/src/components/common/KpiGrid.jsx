import { Box } from '@mui/material';

/**
 * KpiGrid — Grid responsivo para exibir StatsCards.
 * Maximo 6 colunas por linha. Cards quadrados (largura = altura).
 *
 * @param {ReactNode} children - StatsCard components
 * @param {number}    [maxColumns=6] - Maximo de colunas por linha
 * @param {number}    [gap=2] - Espacamento entre cards (MUI spacing)
 * @param {number}    [mb=3] - Margin bottom (MUI spacing)
 */
const KpiGrid = ({ children, maxColumns = 6, gap = 1.5, mb = 3 }) => (
    <Box
        sx={{
            display: 'grid',
            gridTemplateColumns: {
                xs: 'repeat(2, 1fr)',
                sm: 'repeat(3, 1fr)',
                md: `repeat(${Math.min(maxColumns, 4)}, 1fr)`,
                lg: `repeat(${Math.min(maxColumns, 6)}, 1fr)`,
            },
            gap,
            mb,
            '& > *': {
                maxHeight: '180px',
            }
        }}
    >
        {children}
    </Box>
);

export default KpiGrid;
