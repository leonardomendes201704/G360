import { Box } from '@mui/material';

/**
 * KpiGrid — Grid responsivo para exibir StatsCards.
 * Em `md`: por defeito ate 5 colunas; em `lg`: ate `min(maxColumns, 8)`.
 * Use `maxColumnsMd` para forcar mais colunas em `md` (ex.: 8 KPIs numa linha).
 *
 * @param {ReactNode} children - StatsCard components
 * @param {number}    [maxColumns=6] - Maximo de colunas por linha (ate 8 em ecras grandes)
 * @param {number}    [maxColumnsMd] - Opcional: colunas no breakpoint `md` (default: min(maxColumns, 5))
 * @param {number}    [gap=2] - Espacamento entre cards (MUI spacing)
 * @param {number}    [mb=3] - Margin bottom (MUI spacing)
 * @param {boolean}   [clampChildHeight=true] - Se true, limita altura dos filhos (evita cards muito altos na grelha geral)
 * @param {object}    [sx] - `sx` extra fundido no `Box` (pode sobrescrever `gridTemplateColumns`, etc.)
 */
const KpiGrid = ({ children, maxColumns = 6, maxColumnsMd, gap = 1.5, mb = 3, clampChildHeight = true, sx: sxProp }) => {
    const mdCols = maxColumnsMd !== undefined ? Math.min(maxColumnsMd, 8) : Math.min(maxColumns, 5);
    const lgCols = Math.min(maxColumns, 8);
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
                ...sxProp,
            }}
        >
            {children}
        </Box>
    );
};

export default KpiGrid;
