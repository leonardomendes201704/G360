import { useState, useEffect, useCallback, useRef, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, Box, Typography, InputBase } from '@mui/material';
import { Search, OpenInNew } from '@mui/icons-material';
import { ThemeContext } from '../../contexts/ThemeContext';

/**
 * Command Palette — opened via Cmd+K / Ctrl+K
 *
 * Usage in parent (MainLayout):
 *   const [paletteOpen, setPaletteOpen] = useState(false);
 *   useEffect(() => {
 *     const handler = (e) => {
 *       if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setPaletteOpen(true); }
 *     };
 *     window.addEventListener('keydown', handler);
 *     return () => window.removeEventListener('keydown', handler);
 *   }, []);
 *   <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} dataIndex={myIndex} />
 *
 * dataIndex: Array of { id, label, subtitle?, type, icon?, href, action? }
 */

const STATIC_ACTIONS = [
    { id: 'nav-dashboard', label: 'Ir para Visão Geral', type: 'navigation', icon: 'dashboard', href: '/dashboard' },
    { id: 'nav-projects', label: 'Ir para Projetos', type: 'navigation', icon: 'work', href: '/projects' },
    { id: 'nav-tasks', label: 'Ir para Tarefas', type: 'navigation', icon: 'checklist', href: '/tasks' },
    { id: 'nav-incidents', label: 'Ir para Incidentes', type: 'navigation', icon: 'report_problem', href: '/incidents' },
    { id: 'nav-changes', label: 'Ir para GMUD', type: 'navigation', icon: 'published_with_changes', href: '/changes' },
    { id: 'nav-assets', label: 'Ir para Ativos', type: 'navigation', icon: 'devices', href: '/assets' },
    { id: 'nav-contracts', label: 'Ir para Contratos', type: 'navigation', icon: 'description', href: '/contracts' },
    { id: 'nav-suppliers', label: 'Ir para Fornecedores', type: 'navigation', icon: 'handshake', href: '/suppliers' },
    { id: 'nav-risks', label: 'Ir para Riscos', type: 'navigation', icon: 'shield', href: '/risks' },
    { id: 'nav-finance', label: 'Ir para Financeiro', type: 'navigation', icon: 'payments', href: '/finance' },
    { id: 'nav-approvals', label: 'Minhas Aprovações', type: 'navigation', icon: 'fact_check', href: '/approvals' },
    { id: 'nav-knowledge', label: 'Base de Conhecimento', type: 'navigation', icon: 'book', href: '/knowledge' },
];

const TYPE_CONFIG = {
    navigation: { color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
    project: { color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
    incident: { color: '#f43f5e', bg: 'rgba(244,63,94,0.12)' },
    task: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
    contract: { color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
    asset: { color: '#06b6d4', bg: 'rgba(6,182,212,0.12)' },
    supplier: { color: '#f97316', bg: 'rgba(249,115,22,0.12)' },
    risk: { color: '#dc2626', bg: 'rgba(220,38,38,0.12)' },
    change: { color: '#14b8a6', bg: 'rgba(20,184,166,0.12)' },
};

const CommandPalette = ({ open, onClose, dataIndex = [] }) => {
    const [query, setQuery] = useState('');
    const [selectedIdx, setSelectedIdx] = useState(0);
    const { mode } = useContext(ThemeContext);
    const navigate = useNavigate();
    const inputRef = useRef(null);
    const listRef = useRef(null);

    const allItems = [...STATIC_ACTIONS, ...dataIndex];

    const results = query.trim().length < 1
        ? STATIC_ACTIONS.slice(0, 8)
        : allItems.filter(item => {
            const q = query.toLowerCase();
            return (
                item.label?.toLowerCase().includes(q) ||
                item.subtitle?.toLowerCase().includes(q)
            );
        }).slice(0, 12);

    useEffect(() => {
        setSelectedIdx(0);
    }, [query]);

    useEffect(() => {
        if (open) {
            setQuery('');
            setSelectedIdx(0);
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [open]);

    const handleSelect = useCallback((item) => {
        onClose();
        if (item.action) {
            item.action();
        } else if (item.href) {
            navigate(item.href);
        }
    }, [navigate, onClose]);

    const handleKeyDown = (e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIdx(i => Math.min(i + 1, results.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIdx(i => Math.max(i - 1, 0));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (results[selectedIdx]) handleSelect(results[selectedIdx]);
        } else if (e.key === 'Escape') {
            onClose();
        }
    };

    // Auto-scroll selected into view
    useEffect(() => {
        if (listRef.current) {
            const el = listRef.current.children[selectedIdx];
            el?.scrollIntoView({ block: 'nearest' });
        }
    }, [selectedIdx]);

    const isDark = mode === 'dark';
    const bg = isDark ? '#0f1929' : '#ffffff';
    const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
    const inputBg = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)';
    const textPrimary = isDark ? '#f1f5f9' : '#1e293b';
    const textMuted = isDark ? '#64748b' : '#94a3b8';
    const hoverBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)';
    const selectedBg = isDark ? 'rgba(59,130,246,0.12)' : 'rgba(59,130,246,0.08)';

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            PaperProps={{
                sx: {
                    background: bg,
                    borderRadius: '8px',
                    border: `1px solid ${border}`,
                    boxShadow: '0 25px 60px -12px rgba(0,0,0,0.6)',
                    overflow: 'hidden',
                    mt: '10vh',
                    verticalAlign: 'top',
                }
            }}
            BackdropProps={{ sx: { backdropFilter: 'blur(8px)', backgroundColor: 'rgba(0,0,0,0.6)' } }}
            onKeyDown={handleKeyDown}
        >
            {/* Search Input */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 2.5, py: 2, borderBottom: `1px solid ${border}` }}>
                <Search sx={{ color: textMuted, flexShrink: 0 }} />
                <InputBase
                    inputRef={inputRef}
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Buscar páginas, registros, ações..."
                    fullWidth
                    sx={{ fontSize: '16px', color: textPrimary, '& input::placeholder': { color: textMuted } }}
                    autoComplete="off"
                />
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <Box sx={{ bgcolor: border, borderRadius: '8px', px: 1, py: 0.25, fontSize: '11px', color: textMuted, fontFamily: 'monospace' }}>esc</Box>
                </Box>
            </Box>

            {/* Results */}
            <Box
                ref={listRef}
                sx={{ maxHeight: '60vh', overflowY: 'auto', p: 1 }}
            >
                {results.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 6 }}>
                        <Typography sx={{ color: textMuted, fontSize: '14px' }}>Nenhum resultado para "{query}"</Typography>
                    </Box>
                ) : (
                    <>
                        {query.trim().length < 1 && (
                            <Typography sx={{ px: 1.5, py: 1, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: textMuted }}>
                                Navegação Rápida
                            </Typography>
                        )}
                        {results.map((item, idx) => {
                            const tc = TYPE_CONFIG[item.type] || TYPE_CONFIG.navigation;
                            const isSelected = idx === selectedIdx;
                            return (
                                <Box
                                    key={item.id}
                                    onClick={() => handleSelect(item)}
                                    onMouseEnter={() => setSelectedIdx(idx)}
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 2,
                                        px: 1.5,
                                        py: 1.25,
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        bgcolor: isSelected ? selectedBg : 'transparent',
                                        border: isSelected ? `1px solid ${tc.color}30` : '1px solid transparent',
                                        mb: 0.25,
                                        transition: 'all 0.1s',
                                        '&:hover': { bgcolor: isSelected ? selectedBg : hoverBg },
                                    }}
                                >
                                    {/* Icon */}
                                    <Box sx={{ width: 36, height: 36, borderRadius: '8px', bgcolor: tc.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <span className="material-icons-round" style={{ fontSize: '18px', color: tc.color }}>
                                            {item.icon || 'arrow_forward'}
                                        </span>
                                    </Box>

                                    {/* Label & Subtitle */}
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <Typography sx={{ fontSize: '14px', fontWeight: 600, color: textPrimary, lineHeight: 1.2 }}>{item.label}</Typography>
                                        {item.subtitle && (
                                            <Typography sx={{ fontSize: '12px', color: textMuted, mt: 0.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.subtitle}</Typography>
                                        )}
                                    </Box>

                                    {/* Type badge */}
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                        <Box sx={{ bgcolor: tc.bg, borderRadius: '8px', px: 1, py: 0.25, fontSize: '10px', fontWeight: 700, color: tc.color, whiteSpace: 'nowrap' }}>
                                            {item.type === 'navigation' ? 'Página' : item.type}
                                        </Box>
                                        {isSelected && <OpenInNew sx={{ fontSize: 14, color: tc.color }} />}
                                    </Box>
                                </Box>
                            );
                        })}
                    </>
                )}
            </Box>

            {/* Footer hint */}
            <Box sx={{ px: 2.5, py: 1.25, borderTop: `1px solid ${border}`, display: 'flex', gap: 2, alignItems: 'center' }}>
                {[['↑↓', 'navegar'], ['↵', 'abrir'], ['esc', 'fechar']].map(([key, desc]) => (
                    <Box key={key} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        <Box sx={{ bgcolor: border, borderRadius: '8px', px: 1, py: 0.2, fontSize: '11px', color: textMuted, fontFamily: 'monospace' }}>{key}</Box>
                        <Typography sx={{ fontSize: '11px', color: textMuted }}>{desc}</Typography>
                    </Box>
                ))}
            </Box>
        </Dialog>
    );
};

export default CommandPalette;
