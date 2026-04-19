import { Box } from '@mui/material';

/**
 * KpiGrid — Grid responsivo para exibir StatsCards.
 * Em `md`: por defeito ate 5 colunas; em `lg`: ate `min(maxColumns, 7)`.
 * Use `maxColumnsMd` para forcar mais colunas em `md` (ex.: 7 KPIs numa linha).
 *
 * @param {ReactNode} children - StatsCard components
 * @param {number}    [maxColumns=6] - Maximo de colunas por linha (ate 7 em ecras grandes)
 * @param {number}    [maxColumnsMd] - Opcional: colunas no breakpoint `md` (default: min(maxColumns, 5))
 * @param {number}    [gap=2] - Espacamento entre cards (MUI spacing)
 * @param {number}    [mb=3] - Margin bottom (MUI spacing)
 * @param {boolean}   [clampChildHeight=true] - Se true, limita altura dos filhos (evita cards muito altos na grelha geral)
 */
const KpiGrid = ({ children, maxColumns = 6, maxColumnsMd, gap = 1.5, mb = 3, clampChildHeight = true }) => {
    const mdCols = maxColumnsMd !== undefined ? Math.min(maxColumnsMd, 7) : Math.min(maxColumns, 5);
    const lgCols = Math.min(maxColumns, 7);
    return (
        <Box
            sx={{
                display: 'grid',
                gridTemplateColumns: {
                    xs: 'repeat(2, 1fr)',
                    sm: 'repeat(3, 1fr)',
                    md: `repeat(${mdCols}, 1fr)`,
                    lg: `repeat(${lgCols}, 1fr)`,
                },
                gap,
                mb,
                '& > *': {
                    minWidth: 0,
                    ...(clampChildHeight
                        ? {
                            maxHeight: '180px',
                        }
                        : {}),
                },
            }}
        >
            {children}
        </Box>
    );
};

export default KpiGrid;
