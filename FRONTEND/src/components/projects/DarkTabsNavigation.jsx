import { useContext } from 'react';
import { Box, useTheme } from '@mui/material';
import { ThemeContext } from '../../contexts/ThemeContext';

const DarkTabsNavigation = ({ tabValue, setTabValue, tasks = [], risks = [], project }) => {
    const { mode } = useContext(ThemeContext);
    const theme = useTheme();

    // Theme-aware styles
    const textPrimary = mode === 'dark' ? '#f1f5f9' : theme.palette.text.primary;
    const textSecondary = mode === 'dark' ? '#64748b' : theme.palette.text.secondary;
    const borderColor = mode === 'dark' ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.08)';
    const hoverBg = mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.03)';
    const activeBg = mode === 'dark' ? 'rgba(37, 99, 235, 0.1)' : 'rgba(37, 99, 235, 0.08)';
    const countInactiveBg = mode === 'dark' ? 'rgba(100, 116, 139, 0.2)' : 'rgba(100, 116, 139, 0.15)';
    const countInactiveColor = mode === 'dark' ? '#94a3b8' : '#64748b';

    const tabs = [
        { label: 'Visão Geral', icon: 'grid_view', value: 0 },
        { label: 'Tarefas', icon: 'check_circle', value: 1, count: tasks.length },
        { label: 'Riscos', icon: 'warning', value: 2, count: risks.length },
        { label: 'Atas', icon: 'description', value: 3 },
        { label: 'Custos', icon: 'attach_money', value: 4 },
        { label: 'Propostas', icon: 'assignment', value: 5 },
        { label: 'Equipe', icon: 'people', value: 6, count: project?.members?.length || 0 },
        { label: 'Follow-Up', icon: 'trending_up', value: 7 },
    ];

    return (
        <Box
            sx={{
                borderBottom: `1px solid ${borderColor}`,
                background: 'transparent',
            }}
        >
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    overflowX: 'auto',
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                    '&::-webkit-scrollbar': { display: 'none' },
                }}
            >
                {tabs.map((tab) => {
                    const isActive = tabValue === tab.value;

                    return (
                        <Box
                            key={tab.value}
                            data-testid={`tab-${tab.value}`}
                            onClick={() => setTabValue(tab.value)}
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.75,
                                px: 2,
                                py: 1.5,
                                fontSize: '13px',
                                fontWeight: 500,
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                                transition: 'all 0.2s ease',
                                color: isActive ? textPrimary : textSecondary,
                                background: isActive ? activeBg : 'transparent',
                                borderRadius: '8px',
                                position: 'relative',
                                '&::after': {
                                    content: '""',
                                    position: 'absolute',
                                    bottom: 0,
                                    left: 0,
                                    right: 0,
                                    height: '2px',
                                    background: isActive ? '#2563eb' : 'transparent',
                                    borderRadius: '8px',
                                },
                                '&:hover': {
                                    color: isActive ? textPrimary : (mode === 'dark' ? '#94a3b8' : textPrimary),
                                    background: isActive ? activeBg : hoverBg,
                                },
                            }}
                        >
                            <span
                                className="material-icons-round"
                                style={{
                                    fontSize: 18,
                                    color: isActive ? '#2563eb' : textSecondary,
                                }}
                            >
                                {tab.icon}
                            </span>
                            <span>{tab.label}</span>
                            {tab.count !== undefined && tab.count !== null && tab.count > 0 && (
                                <Box
                                    sx={{
                                        minWidth: 18,
                                        height: 18,
                                        px: 0.5,
                                        borderRadius: '8px',
                                        fontSize: '11px',
                                        fontWeight: 600,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        background: isActive
                                            ? 'linear-gradient(135deg, #2563eb, #3b82f6)'
                                            : countInactiveBg,
                                        color: isActive ? '#fff' : countInactiveColor,
                                    }}
                                >
                                    {tab.count}
                                </Box>
                            )}
                        </Box>
                    );
                })}
            </Box>
        </Box>
    );
};

export default DarkTabsNavigation;

