import { Box } from '@mui/material';
import KpiGrid from '../common/KpiGrid';

/**
 * Faixa de KPIs densa alinhada à aba Visão geral (KpiGrid + StatsCard `dense`).
 *
 * @param {number} [columnCount=5] — Colunas na grelha (1–8).
 */
const ProjectTabKpiStrip = ({ columnCount = 5, children }) => {
    const n = Math.min(Math.max(columnCount, 1), 8);
    return (
        <Box
            sx={{
                width: '100%',
                overflowX: 'auto',
                WebkitOverflowScrolling: 'touch',
                mb: 4,
            }}
        >
            <KpiGrid
                maxColumns={n}
                maxColumnsMd={n}
                gap={1}
                mb={0}
                clampChildHeight
                sx={{
                    width: { xs: `max(100%, ${n * 100}px)`, md: '100%' },
                    gridTemplateColumns: {
                        xs: `repeat(${n}, minmax(100px, 1fr))`,
                        sm: `repeat(${n}, minmax(100px, 1fr))`,
                        md: `repeat(${n}, 1fr)`,
                        lg: `repeat(${n}, 1fr)`,
                    },
                    '& > *': {
                        minWidth: 0,
                        maxHeight: '148px',
                    },
                }}
            >
                {children}
            </KpiGrid>
        </Box>
    );
};

export default ProjectTabKpiStrip;
