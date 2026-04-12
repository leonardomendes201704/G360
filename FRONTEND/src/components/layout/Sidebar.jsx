import { Link, useLocation } from 'react-router-dom';
import { useContext } from 'react';
import {
  Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText,
  Box, Typography, useTheme, useMediaQuery, IconButton, Tooltip
} from '@mui/material';
import {
  Dashboard, CheckCircle, SwapHoriz,
  Description, AttachMoney, Devices, Settings, RocketLaunch, MenuOpen, Business, History, School, KeyboardDoubleArrowLeft, Security, SupportAgent, HeadsetMic, BugReport, Warning
} from '@mui/icons-material';
import { AuthContext } from '../../contexts/AuthContext';
import logoLight from '../../assets/g360_logo_light.png';

const drawerWidth = 240;

const Sidebar = ({ isCollapsed, toggleSidebar, isMobile, mobileOpen, toggleMobile }) => {
  const location = useLocation();
  const theme = useTheme();
  const { user, hasPermission } = useContext(AuthContext);

  const roles = user?.roles || (user?.role ? (typeof user.role === 'string' ? [{ name: user.role }] : [user.role]) : []);
  const roleNames = roles.map(r => (typeof r === 'string' ? r : r.name));
  
  const isGlobalSuperAdmin = roleNames.includes('Super Admin') && user?.schema === 'public';
  const isTenantSuperAdmin = roleNames.includes('Super Admin') && user?.schema !== 'public';

  /** Qualquer permissão no módulo (chaves canônicas rbac-matrix.json + legado KNOWLEDGE_BASE). */
  const canAccessModule = (module) => {
    if (!module) return true;
    if (isGlobalSuperAdmin || isTenantSuperAdmin) return true;
    return hasPermission(module);
  };

  const menuItems = [
    { text: 'Visão Geral', icon: <Dashboard />, path: '/dashboard', module: null, isMain: true, color: '#60a5fa' },
    { text: 'Portal de Suporte', icon: <HeadsetMic />, path: '/portal', module: 'HELPDESK', isPublicModule: true, color: '#38bdf8' },
    { text: 'Service Desk', icon: <SupportAgent />, path: '/servicedesk', module: 'HELPDESK', color: '#10b981' },
    { text: 'Incidentes', icon: <Warning />, path: '/incidents', module: 'INCIDENT', color: '#f87171' },
    { text: 'Problemas (ITIL)', icon: <BugReport />, path: '/servicedesk/problems', module: 'PROBLEM', color: '#f59e0b' },
    { text: 'Financeiro', icon: <AttachMoney />, path: '/finance', module: 'FINANCE', color: '#fbbf24' },
    { text: 'Projetos', icon: <RocketLaunch />, path: '/projects', module: 'PROJECTS', color: '#f472b6' },
    { text: 'Tarefas', icon: <CheckCircle />, path: '/tasks', module: 'TASKS', color: '#34d399' },
    { text: 'Gestão de Mudança', icon: <SwapHoriz />, path: '/changes', module: 'GMUD', color: '#fbbf24' },
    { text: 'Riscos', icon: <Security />, path: '/risks', module: 'RISKS', color: '#ef4444' },
    { text: 'Minhas Aprovações', icon: <History />, path: '/approvals', module: 'APPROVALS', color: '#818cf8' },
    { text: 'Contratos', icon: <Description />, path: '/contracts', module: 'CONTRACTS', color: '#94a3b8' },
    { text: 'Fornecedores', icon: <Business />, path: '/suppliers', module: 'SUPPLIERS', color: '#f87171' },
    { text: 'Ativos', icon: <Devices />, path: '/assets', module: 'ASSETS', color: '#818cf8' },
    { text: 'Base de Conhecimento', icon: <School />, path: '/knowledge', module: 'KB', color: '#c084fc' },

    { text: 'Atividade Recente', icon: <History />, path: '/activities', module: 'ACTIVITY_LOG', color: '#64748b' },
  ];

  const configItem = { text: 'Configurações', icon: <Settings />, path: '/config/organization', module: 'CONFIG', color: '#94a3b8' };

  const enabledModules = user?.enabledModules;

  const isModuleEnabled = (module) => {
    if (!module) return true; // items without module (e.g. Dashboard) always visible
    if (!enabledModules || enabledModules.length === 0) return true; // null/empty = all enabled
    if (enabledModules.includes(module)) return true;
    if (module === 'KB' && enabledModules.includes('KNOWLEDGE_BASE')) return true;
    return false;
  };

  const visibleItems = menuItems
    .filter(item => isModuleEnabled(item.module))
    .filter(item => item.isPublicModule ? true : canAccessModule(item.module));
  const showConfig = isModuleEnabled(configItem.module) && canAccessModule(configItem.module);

  const Logo = () => (
    <Box sx={{
      display: 'flex', alignItems: 'center', justifyContent: (isCollapsed && !isMobile) ? 'center' : 'space-between',
      px: (isCollapsed && !isMobile) ? 0 : 3, py: 3, mb: 1,
      minHeight: 64
    }}>
      {(isCollapsed && !isMobile) ? (
        <Tooltip title="Expandir menu" placement="right">
          <Box
            onClick={toggleSidebar}
            sx={{
              width: 40, height: 40, borderRadius: '12px',
              background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
              color: 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 800, fontSize: '20px', cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
              transition: 'all 0.2s',
              '&:hover': { transform: 'scale(1.05)', boxShadow: '0 6px 16px rgba(37, 99, 235, 0.4)' }
            }}
          >
            G
          </Box>
        </Tooltip>
      ) : (
        <Tooltip title="Recolher menu">
          <Box
            onClick={toggleSidebar}
            sx={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%',
              cursor: 'pointer',
              p: 1, mx: -1, borderRadius: 2,
              transition: 'background-color 0.2s',
              '&:hover': { bgcolor: '#f8fafc' },
              '&:hover .collapse-icon': { opacity: 1, transform: 'translateX(0)' }
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <Box
                component="img"
                src={logoLight}
                alt="G360 Enterprise"
                sx={{
                  height: 45,
                  objectFit: 'contain',
                }}
              />
            </Box>
            <KeyboardDoubleArrowLeft
              className="collapse-icon"
              sx={{
                color: '#cbd5e1',
                fontSize: 20,
                opacity: 0,
                transform: 'translateX(10px)',
                transition: 'all 0.3s ease-out'
              }}
            />
          </Box>
        </Tooltip>
      )
      }
    </Box >
  );

  return (
    <Drawer
      variant={isMobile ? "temporary" : "permanent"}
      open={isMobile ? mobileOpen : true}
      onClose={isMobile ? toggleMobile : undefined}
      ModalProps={{
        keepMounted: true, // Better open performance on mobile.
      }}
      sx={{
        width: isMobile ? drawerWidth : (isCollapsed ? 70 : drawerWidth),
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: {
          width: isMobile ? drawerWidth : (isCollapsed ? 70 : drawerWidth),
          boxSizing: 'border-box',
          backgroundColor: '#FFFFFF', // Fundo Branco
          color: '#1e293b',
          borderRight: '1px solid #e2e8f0', // Borda sutil
          overflowX: 'hidden',
          transition: !isMobile ? 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        },
      }}
    >
      <Box>
        <Logo />

        <List component="nav" sx={{ px: 2 }}>
          {visibleItems.map((item) => {
            const matchingItems = visibleItems.filter(i => location.pathname.startsWith(i.path));
            const bestMatch = matchingItems.sort((a, b) => b.path.length - a.path.length)[0];
            const isActive = bestMatch?.path === item.path;

            return (
              <ListItem key={item.text} disablePadding sx={{ display: 'block', mb: 0.5 }}>
                <ListItemButton
                  component={Link}
                  to={item.path}
                  selected={isActive}
                  onClick={isMobile ? toggleMobile : undefined}
                  sx={{
                    minHeight: 44, // Altura padrão SaaS (44px)
                    justifyContent: (isCollapsed && !isMobile) ? 'center' : 'initial',
                    px: 2.5,
                    my: 0.5, // Espaçamento vertical
                    borderRadius: '8px', // Bordas menos arredondadas estilo SaaS
                    position: 'relative',
                    transition: 'all 0.2s',
                    color: isActive ? '#2563eb' : '#64748b', // Roxo se ativo
                    backgroundColor: isActive ? '#e0e7ff' : 'transparent', // Fundo roxo muito claro se ativo
                    '&:hover': {
                      bgcolor: '#f1f5f9',
                      color: '#1e293b'
                    },
                    ...(isActive && {
                      fontWeight: 600,
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        left: 0,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        height: '24px', // Altura do accent proporcional
                        width: '4px',
                        borderTopRightRadius: '4px',
                        borderBottomRightRadius: '4px',
                        bgcolor: '#2563eb'
                      }
                    })
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 0,
                      mr: (isCollapsed && !isMobile) ? 0 : 1.5, // 12px gap (Standard)
                      justifyContent: 'center',
                      color: isActive ? '#2563eb' : '#94a3b8', // Icone segue a cor
                      transition: 'color 0.2s',
                      '& .MuiSvgIcon-root': {
                        fontSize: 20 // 20px icon size (Refined)
                      }
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>

                  <ListItemText
                    primary={item.text}
                    sx={{ opacity: (isCollapsed && !isMobile) ? 0 : 1 }}
                    primaryTypographyProps={{
                      fontSize: '0.875rem',
                      fontWeight: isActive ? 600 : 500
                    }}
                  />
                </ListItemButton>
              </ListItem>
            );
          })}

          {showConfig && (
            <ListItem disablePadding sx={{ display: 'block', mt: 4 }}>
              <ListItemButton
                component={Link}
                to={configItem.path}
                onClick={isMobile ? toggleMobile : undefined}
                sx={{
                  minHeight: 50,
                  justifyContent: (isCollapsed && !isMobile) ? 'center' : 'initial',
                  px: 2.5,
                  borderRadius: '12px',
                  color: '#94a3b8',
                  '&:hover': { bgcolor: '#1e293b', color: '#fff' }
                }}
              >
                <ListItemIcon sx={{ minWidth: 0, mr: (isCollapsed && !isMobile) ? 0 : 1.5, color: configItem.color, justifyContent: 'center' }}>
                  {configItem.icon}
                </ListItemIcon>
                <ListItemText
                  primary={configItem.text}
                  sx={{
                    opacity: (isCollapsed && !isMobile) ? 0 : 1,
                    display: (isCollapsed && !isMobile) ? 'none' : 'block'
                  }}
                />
              </ListItemButton>
            </ListItem>
          )}

        </List>
      </Box>

      <Box sx={{ p: 3, opacity: (isCollapsed && !isMobile) ? 0 : 1, transition: 'opacity 0.2s' }}>
        <Typography variant="caption" sx={{ color: '#475569', display: 'block' }}>
          v2.0.0 Single Tenant
        </Typography>
      </Box>

    </Drawer>
  );
};

export default Sidebar;