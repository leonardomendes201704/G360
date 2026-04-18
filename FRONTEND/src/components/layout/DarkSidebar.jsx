import { Link, useLocation } from 'react-router-dom';
import { useContext, useState } from 'react';
import { Box, Collapse, Drawer, IconButton, Tooltip, useTheme } from '@mui/material';
import { ChevronLeft, ChevronRight, ExpandMore } from '@mui/icons-material';
import { AuthContext } from '../../contexts/AuthContext';
import { permissionModuleMatches } from '../../utils/rbacPermissions';
import { ThemeContext } from '../../contexts/ThemeContext'; // Importar ThemeContext
import logoLight from '../../assets/g360_logo_light.png';
import logoDark from '../../assets/g360_logo_dark.png';

const SIDEBAR_WIDTH_EXPANDED = 260;
const SIDEBAR_WIDTH_COLLAPSED = 72;

const DarkSidebar = ({ isCollapsed, toggleSidebar, isMobile, mobileOpen, toggleMobile }) => {
    const location = useLocation();
    const { user } = useContext(AuthContext);
    const { mode } = useContext(ThemeContext); // Consumir modo
    const theme = useTheme(); // Consumir tema MUI

    // Extrai roles e Tenant Info
    const roles = user?.roles || (user?.role ? [user.role] : []);
    const roleNames = roles.map(r => r.name);
    
    // Identificação via Schema (Matriz vs Filial)
    const isGlobalSuperAdmin = roleNames.includes('Super Admin') && user?.schema === 'public';
    const isTenantSuperAdmin = roleNames.includes('Super Admin') && user?.schema !== 'public';
    
    // O Master das seções (visualiza o menu reduzido de Plataforma) é APENAS o Global.
    const isMaster = isGlobalSuperAdmin;

    // Função para verificar se o usuário tem permissão para um módulo
    const hasPermission = (module) => {
        if (!module) return true;
        if (isGlobalSuperAdmin || isTenantSuperAdmin) return true;
        if (roles.length === 0) return false;

        const allPermissions = roles.flatMap(r => r.permissions || []);
        return allPermissions.some((p) => {
            if (p.module === 'ALL' && p.action === 'ALL') return true;
            return permissionModuleMatches(p.module, module);
        });
    };

    // Definição dos Menus
    const masterSections = [
        {
            title: 'PLATAFORMA',
            items: [
                { icon: 'grid_view', label: 'Visão Geral', path: '/dashboard', module: null },
                { icon: 'domain', label: 'Tenants', path: '/config/tenants', module: 'SUPER_ADMIN' },
            ]
        },
        {
            title: 'SISTEMA',
            items: [
                { icon: 'admin_panel_settings', label: 'Configurações Globais', path: '/config/global', module: 'CONFIG' },
                { icon: 'history', label: 'Logs de Auditoria', path: '/activities', module: 'ACTIVITY_LOG' },
            ]
        }
    ];

    const regularSections = [
        {
            title: 'MEU ESPAÇO',
            items: [
                { icon: 'grid_view', label: 'Visão Geral', path: '/dashboard', module: null },
                { icon: 'how_to_reg', label: 'Minhas Aprovações', path: '/approvals', module: 'APPROVALS' },
                { icon: 'headset_mic', label: 'Portal de Suporte', path: '/portal', module: 'HELPDESK', isPublicModule: true },
            ]
        },
        {
            title: 'SERVIÇOS DE TI',
            items: [
                { icon: 'support_agent', label: 'Service Desk', path: '/servicedesk', module: 'HELPDESK' },
                { icon: 'warning', label: 'Incidentes', path: '/incidents', module: 'INCIDENT' },
                { icon: 'bug_report', label: 'Problemas (ITIL)', path: '/servicedesk/problems', module: 'PROBLEM' },
                { icon: 'swap_horiz', label: 'Gestão de Mudança', path: '/changes', module: 'GMUD' },
                { icon: 'inventory_2', label: 'Ativos', path: '/assets', module: 'ASSETS' },
                { icon: 'menu_book', label: 'Base de Conhecimento', path: '/knowledge', module: 'KB' },
            ]
        },
        {
            title: 'PROJETOS',
            items: [
                { icon: 'rocket_launch', label: 'Projetos', path: '/projects', module: 'PROJECTS' },
                { icon: 'task_alt', label: 'Tarefas', path: '/tasks', module: 'TASKS' },
            ]
        },
        {
            title: 'CORPORATIVO',
            items: [
                { icon: 'attach_money', label: 'Financeiro', path: '/finance', module: 'FINANCE' },
                { icon: 'description', label: 'Contratos', path: '/contracts', module: 'CONTRACTS' },
                { icon: 'business', label: 'Fornecedores', path: '/suppliers', module: 'SUPPLIERS' },
            ]
        },
        {
            title: 'GOVERNANÇA & SISTEMA',
            items: [
                { icon: 'security', label: 'Riscos & Compliance', path: '/risks', module: 'RISKS' },
                { icon: 'history', label: 'Atividade Recente', path: '/activities', module: 'ACTIVITY_LOG' },
            ]
        },
        {
            title: 'CONFIGURAÇÕES',
            items: [
                { icon: 'settings', label: 'Configurações', path: '/config/organization', module: 'CONFIG' },
            ]
        }
    ];

    // Seleciona as seções corretas
    const activeSections = isMaster ? masterSections : regularSections;

    // Filtra as seções e itens baseado nas permissões
    const filteredSections = activeSections.map(section => ({
        ...section,
        items: section.items.filter(item => item.isPublicModule ? true : hasPermission(item.module))
    })).filter(section => section.items.length > 0);

    const isActive = (path) => {
        const allPaths = filteredSections.flatMap(s => s.items.map(i => i.path));
        const matchingPaths = allPaths.filter(p => location.pathname.startsWith(p));
        const bestMatch = matchingPaths.sort((a, b) => b.length - a.length)[0];
        return bestMatch === path;
    };

    const sidebarWidth = isCollapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED;

    // Estado de colapso por seção — todas abertas por padrão
    const [openSections, setOpenSections] = useState(() => {
        const initial = {};
        filteredSections.forEach((_, idx) => { initial[idx] = true; });
        return initial;
    });

    const toggleSection = (idx) => {
        setOpenSections(prev => ({ ...prev, [idx]: !prev[idx] }));
    };

    // Cores Dinâmicas
    const sidebarBg = mode === 'dark' ? '#161d26' : '#ffffff';
    const sidebarBorder = mode === 'dark' ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.08)';
    const sectionTitleColor = mode === 'dark' ? '#64748b' : '#94a3b8';
    const itemColor = mode === 'dark' ? '#94a3b8' : '#64748b';
    const itemHoverBg = mode === 'dark' ? '#1c2632' : '#f1f5f9';
    const itemHoverColor = mode === 'dark' ? '#f1f5f9' : '#1e293b';
    const separatorColor = mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

    // Não definir isto como <Component /> interno: a função nova a cada render faz o React
    // desmontar/remontar todo o menu (scroll volta ao topo, perde-se o foco).
    const sidebarMarkup = (
        <Box
            sx={{
                width: sidebarWidth,
                height: '100vh',
                background: sidebarBg,
                borderRight: `1px solid ${sidebarBorder}`,
                display: 'flex',
                flexDirection: 'column',
                position: 'fixed',
                left: 0,
                top: 0,
                zIndex: 1200,
                transition: 'width 0.3s ease',
                overflow: 'hidden',
            }}
        >
            {/* Logo Header */}
            <Box
                sx={{
                    px: isCollapsed ? 1.5 : 3,
                    borderBottom: `1px solid ${sidebarBorder}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: isCollapsed ? 'center' : 'center',
                    height: '125px',
                    paddingBottom: '10px',
                    boxSizing: 'border-box',
                }}
            >
                {/* Image Logo */}
                <Box
                    component="img"
                    src={mode === 'dark' ? logoDark : logoLight}
                    alt="G360 Enterprise"
                    sx={{
                        height: isCollapsed ? '50px' : '110px',
                        width: 'auto',
                        transition: 'all 0.3s ease',
                        objectFit: 'contain',
                        // Inverter cor do logo se necessário (se for branco) ou manter se for colorido
                        filter: mode === 'light' ? 'none' : 'none'
                    }}
                />
            </Box>

            {/* Navigation - Scrollbar Hidden */}
            <Box
                sx={{
                    flex: 1,
                    p: 1.5,
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                    '&::-webkit-scrollbar': {
                        display: 'none',
                    },
                }}
            >
                {filteredSections.map((section, idx) => (
                    <Box key={idx} sx={{ mb: 1 }}>
                        {!isCollapsed ? (
                            <Box
                                onClick={() => toggleSection(idx)}
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    fontSize: '10px',
                                    textTransform: 'uppercase',
                                    letterSpacing: '1.5px',
                                    color: sectionTitleColor,
                                    px: 1.5,
                                    py: 1,
                                    mb: 0.5,
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    userSelect: 'none',
                                    transition: 'background 0.2s ease',
                                    '&:hover': {
                                        background: itemHoverBg,
                                    },
                                }}
                            >
                                <span>{section.title}</span>
                                <ExpandMore
                                    sx={{
                                        fontSize: 16,
                                        transition: 'transform 0.25s ease',
                                        transform: openSections[idx] ? 'rotate(0deg)' : 'rotate(-90deg)',
                                    }}
                                />
                            </Box>
                        ) : (
                            idx > 0 && (
                                <Box sx={{ mx: 2, my: 1.5, borderTop: `1px solid ${separatorColor}` }} />
                            )
                        )}
                        <Collapse in={isCollapsed || openSections[idx]} timeout={200}>
                            {section.items.map((item, itemIdx) => (
                                <Tooltip
                                    key={itemIdx}
                                    title={isCollapsed ? item.label : ''}
                                    placement="right"
                                    arrow
                                >
                                    <Box
                                        component={Link}
                                        to={item.path}
                                        data-testid={`nav-${item.path.replace('/', '').replace('/', '-')}`}
                                        onClick={() => {
                                            if (isMobile && toggleMobile) toggleMobile();
                                        }}
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: isCollapsed ? 'center' : 'flex-start',
                                            gap: 1.5,
                                            px: isCollapsed ? 0 : item.indent ? 2 : 2,
                                            pl: !isCollapsed && item.indent ? 4.5 : undefined,
                                            py: item.indent ? 1 : 1.5,
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            textDecoration: 'none',
                                            transition: 'all 0.2s ease',
                                            color: isActive(item.path) ? '#2563eb' : itemColor,
                                            background: isActive(item.path)
                                                ? 'rgba(37, 99, 235, 0.15)'
                                                : 'transparent',
                                            border: 'none',
                                            mb: 0.25,
                                            mx: isCollapsed ? 1 : 0,
                                            '&:hover': {
                                                background: isActive(item.path)
                                                    ? 'rgba(37, 99, 235, 0.15)'
                                                    : itemHoverBg,
                                                color: isActive(item.path)
                                                    ? (mode === 'dark' ? '#f1f5f9' : '#1d4ed8')
                                                    : itemColor,
                                            },
                                        }}
                                    >
                                        <span
                                            className="material-icons-round"
                                            style={{ fontSize: item.indent ? 18 : 20 }}
                                        >
                                            {item.icon}
                                        </span>
                                        {!isCollapsed && (
                                            <span style={{ fontSize: item.indent ? 13 : 14, fontWeight: 500, whiteSpace: 'nowrap' }}>
                                                {item.label}
                                            </span>
                                        )}
                                    </Box>
                                </Tooltip>
                            ))}
                        </Collapse>
                    </Box>
                ))}
            </Box>

            {/* Collapse Toggle Button */}
            <Box
                sx={{
                    borderTop: `1px solid ${sidebarBorder}`,
                    p: 1.5,
                    display: 'flex',
                    justifyContent: isCollapsed ? 'center' : 'flex-end',
                }}
            >
                <IconButton
                    onClick={toggleSidebar}
                    sx={{
                        width: 36,
                        height: 36,
                        borderRadius: '8px',
                        background: mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0,0,0,0.05)',
                        color: mode === 'dark' ? '#64748b' : '#94a3b8',
                        transition: 'all 0.2s',
                        '&:hover': {
                            background: 'rgba(37, 99, 235, 0.15)',
                            color: '#2563eb',
                        },
                    }}
                >
                    {isCollapsed ? <ChevronRight /> : <ChevronLeft />}
                </IconButton>
            </Box>
        </Box>
    );

    if (isMobile) {
        return (
            <Drawer
                variant="temporary"
                open={mobileOpen}
                onClose={toggleMobile}
                ModalProps={{ keepMounted: true }}
                sx={{
                    '& .MuiDrawer-paper': {
                        width: SIDEBAR_WIDTH_EXPANDED,
                        boxSizing: 'border-box',
                        background: sidebarBg,
                    },
                }}
            >
                {sidebarMarkup}
            </Drawer>
        );
    }

    return sidebarMarkup;
};

// Export constants for MainLayout
export { SIDEBAR_WIDTH_EXPANDED, SIDEBAR_WIDTH_COLLAPSED };
export default DarkSidebar;
