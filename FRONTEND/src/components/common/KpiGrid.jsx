import { Box } from '@mui/material';

/**
 * KpiGrid — Grid responsivo para exibir StatsCards lado a lado, centralizados.
 *
 * @param {ReactNode} children - StatsCard components
 * @param {string}    [minWidth='155px'] - Largura minima de cada card
 * @param {number}    [gap=2] - Espacamento entre cards (MUI spacing)
 * @param {number}    [mb=4] - Margin bottom (MUI spacing)
 * @param {boolean}   [center=true] - Centralizar cards na pagina
 */
const KpiGrid = ({ children, minWidth = '155px', gap = 2, mb = 4, center = true }) => (
    <Box
        sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap,
            mb,
            justifyContent: center ? 'center' : 'flex-start',
            '& > *': {
                minWidth,
                flex: `1 1 ${minWidth}`,
                maxWidth: '200px',
            }
        }}
    >
        {children}
    </Box>
);

export default KpiGrid;
