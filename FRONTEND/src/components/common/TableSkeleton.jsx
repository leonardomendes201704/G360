import { Box, Skeleton } from '@mui/material';

/**
 * Generic table skeleton loader.
 * Replaces the loading spinner in list pages.
 *
 * Props:
 *   rows       – number of skeleton rows (default 8)
 *   columns    – array of flex-basis percentages [15, 30, 20, 20, 15]
 *   hasActions – show action button skeletons on right (default true)
 */
const TableSkeleton = ({ rows = 8, columns: columnsProp = [15, 30, 20, 20, 15], hasActions = true }) => {
    const columns = Array.isArray(columnsProp)
        ? columnsProp
        : Array.from({ length: columnsProp }, () => Math.floor(100 / columnsProp));
    return (
        <Box sx={{ width: '100%' }}>
            {/* Header */}
            <Box sx={{ display: 'flex', gap: 2, px: 3, py: 1.5, borderBottom: '1px solid rgba(148,163,184,0.1)' }}>
                {columns.map((w, i) => (
                    <Skeleton key={i} variant="rounded" height={11} sx={{ flexBasis: `${w}%`, flexShrink: 0, borderRadius: '8px' }} animation="wave" />
                ))}
                {hasActions && (
                    <Skeleton variant="rounded" height={11} sx={{ marginLeft: 'auto', width: 80, borderRadius: '8px' }} animation="wave" />
                )}
            </Box>

            {/* Rows */}
            {Array.from({ length: rows }).map((_, rowIdx) => (
                <Box
                    key={rowIdx}
                    sx={{
                        display: 'flex',
                        gap: 2,
                        px: 3,
                        py: 2.25,
                        alignItems: 'center',
                        borderBottom: '1px solid rgba(148,163,184,0.06)',
                    }}
                >
                    {columns.map((w, colIdx) => {
                        const isFirst = colIdx === 0;
                        return (
                            <Box key={colIdx} sx={{ flexBasis: `${w}%`, flexShrink: 0 }}>
                                {isFirst ? (
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                        <Skeleton variant="rounded" width={32} height={32} sx={{ borderRadius: '8px', flexShrink: 0 }} animation="wave" />
                                        <Box sx={{ flex: 1 }}>
                                            <Skeleton variant="rounded" height={12} sx={{ mb: 0.75, borderRadius: '8px' }} animation="wave" />
                                            <Skeleton variant="rounded" height={10} width="55%" sx={{ borderRadius: '8px' }} animation="wave" />
                                        </Box>
                                    </Box>
                                ) : colIdx === 1 ? (
                                    <Skeleton variant="rounded" height={24} width="70%" sx={{ borderRadius: '8px' }} animation="wave" />
                                ) : (
                                    <Skeleton variant="rounded" height={12} sx={{ borderRadius: '8px' }} animation="wave" />
                                )}
                            </Box>
                        );
                    })}
                    {hasActions && (
                        <Box sx={{ marginLeft: 'auto', display: 'flex', gap: 1 }}>
                            <Skeleton variant="rounded" width={30} height={30} sx={{ borderRadius: '8px' }} animation="wave" />
                            <Skeleton variant="rounded" width={30} height={30} sx={{ borderRadius: '8px' }} animation="wave" />
                        </Box>
                    )}
                </Box>
            ))}
        </Box>
    );
};

export default TableSkeleton;
