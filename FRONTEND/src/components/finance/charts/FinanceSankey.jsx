import { Box, Typography, Paper } from '@mui/material';

// Simplistic Sankey implementation using SVG
// Nodes: Left (Total), Right (Distribution)
const FinanceSankey = ({ data }) => {
    if (!data || !data.nodes || data.nodes.length === 0) return null;

    const { nodes, links, total } = data;
    const width = 800;
    const height = 400;
    const nodeWidth = 120;
    const padding = 20;

    // Source Node (Total) is assumed to be index 0, positioned Left-Center
    const sourceNode = nodes[0];

    // Target Nodes (CCs + Others) positioned Right, stacked
    // We need to calculate vertical positions based on values

    // Y Position Calculator
    let currentY = padding;
    const targetNodesLayout = nodes.slice(1).map((node, i) => {
        // Find link to get value
        const link = links.find(l => l.target === i + 1);
        const value = link ? link.value : 0;
        const heightRatio = value / total;
        // Available height for targets = height - (padding * 2) - gaps
        // Actually let's just use proportional height
        const nodeH = Math.max((height - padding * 2) * heightRatio, 20); // Min height 20

        const layout = {
            ...node,
            x: width - nodeWidth - padding,
            y: currentY,
            height: nodeH,
            value
        };
        currentY += nodeH + 10; // 10px gap
        return layout;
    });

    const sourceLayout = {
        ...sourceNode,
        x: padding,
        y: (height - Math.max(height * 0.8, 100)) / 2, // Centered roughly
        height: Math.max(height * 0.8, 100), // Takes up most height
        value: total
    };

    const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: "compact" }).format(val);

    return (
        <Paper elevation={0} variant="outlined" sx={{ p: 2, borderRadius: '8px', overflowX: 'auto' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Box sx={{ width: 32, height: 32, borderRadius: '8px', bgcolor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🌊</Box>
                <Typography variant="h6" fontWeight={700} color="text.primary">Fluxo de Orçamento (Sankey)</Typography>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                <svg width={width} height={height} style={{ overflow: 'visible' }}>

                    {/* LINKS (Paths) */}
                    {targetNodesLayout.map((target, i) => {
                        // Bezier Curve
                        // Start: Right side of Source
                        // End: Left side of Target
                        // The source "height" for this specific link depends on its proportion within the total
                        // but for simplicity in this V1, let's just verify if we fan out from a single point or distribute the source height.
                        // Distributed source height looks better.

                        // Calculate offset in source
                        // We need accumulated value before this target to know where to start on source Y
                        let valueBefore = 0;
                        for (let j = 0; j < i; j++) valueBefore += targetNodesLayout[j].value;

                        const sourceYStart = sourceLayout.y + (sourceLayout.height * (valueBefore / total));
                        const sourceLinkHeight = sourceLayout.height * (target.value / total);

                        const startX = sourceLayout.x + nodeWidth;
                        const startY = sourceYStart + (sourceLinkHeight / 2);

                        const endX = target.x;
                        const endY = target.y + (target.height / 2);

                        const controlPointX1 = startX + (width * 0.4);
                        const controlPointX2 = endX - (width * 0.4);

                        return (
                            <path
                                key={i}
                                d={`M ${startX} ${startY} C ${controlPointX1} ${startY}, ${controlPointX2} ${endY}, ${endX} ${endY}`}
                                fill="none"
                                stroke="#cbd5e1"
                                strokeWidth={Math.max(sourceLinkHeight, 2)}
                                strokeOpacity={0.4}
                                style={{ transition: 'stroke 0.3s' }}
                                onMouseEnter={(e) => e.target.setAttribute('stroke', '#94a3b8')}
                                onMouseLeave={(e) => e.target.setAttribute('stroke', '#cbd5e1')}
                            />
                        );
                    })}

                    {/* SOURCE NODE */}
                    <g>
                        <rect x={sourceLayout.x} y={sourceLayout.y} width={nodeWidth} height={sourceLayout.height} rx={8} fill="#3b82f6" />
                        <text x={sourceLayout.x + 10} y={sourceLayout.y + 20} fill="white" fontWeight="bold" fontSize="12" style={{ pointerEvents: 'none' }}>
                            {sourceLayout.name}
                        </text>
                        <text x={sourceLayout.x + 10} y={sourceLayout.y + 40} fill="white" fontSize="11" opacity={0.9} style={{ pointerEvents: 'none' }}>
                            {formatCurrency(total)}
                        </text>
                    </g>

                    {/* TARGET NODES */}
                    {targetNodesLayout.map((node, i) => (
                        <g key={i}>
                            <rect x={node.x} y={node.y} width={nodeWidth} height={node.height} rx={8} fill={node.name === 'Outros' ? '#94a3b8' : '#22c55e'} />
                            {node.height > 30 && (
                                <>
                                    <text x={node.x + 10} y={node.y + 20} fill="white" fontWeight="bold" fontSize="12" style={{ pointerEvents: 'none' }}>
                                        {node.name.length > 15 ? node.name.substring(0, 12) + '...' : node.name}
                                    </text>
                                    <text x={node.x + 10} y={node.y + 40} fill="white" fontSize="11" opacity={0.9} style={{ pointerEvents: 'none' }}>
                                        {formatCurrency(node.value)}
                                    </text>
                                </>
                            )}
                        </g>
                    ))}

                </svg>
            </Box>
        </Paper>
    );
};

export default FinanceSankey;
