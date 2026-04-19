import { useContext, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import DarkSidebar, { SIDEBAR_WIDTH_EXPANDED, SIDEBAR_WIDTH_COLLAPSED } from './DarkSidebar';
import { AuthContext } from '../../contexts/AuthContext';
import { ThemeContext } from '../../contexts/ThemeContext';
import notificationService from '../../services/notification.service';
import {
  Notifications, Person, Settings, Logout, Menu as MenuIcon, Search,
  LightMode, DarkMode
} from '@mui/icons-material';
import {
  IconButton, Badge, Menu, MenuItem, ListItemIcon,
  Divider, Avatar, Typography, Box, Tooltip, useTheme, useMediaQuery
} from '@mui/material';
import UserModal from '../modals/UserModal';
import NotificationsModal from '../modals/NotificationsModal';
import PageTransition from '../common/PageTransition';
import CommandPalette from '../common/CommandPalette';
import { formatRelative } from '../../utils/dateUtils';

const MainLayout = ({ children }) => {
  const { user, logout } = useContext(AuthContext);
  const { mode, toggleTheme } = useContext(ThemeContext);
  const { enqueueSnackbar } = useSnackbar();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const navigate = useNavigate();

  // Estados para Menus
  const [notifAnchor, setNotifAnchor] = useState(null);
  const [userAnchor, setUserAnchor] = useState(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [notificationsModalOpen, setNotificationsModalOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  // Notification States
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const toggleSidebar = () => setSidebarCollapsed(!sidebarCollapsed);
  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);

  // Handlers
  const handleOpenNotif = (e) => setNotifAnchor(e.currentTarget);
  const handleCloseNotif = () => setNotifAnchor(null);

  const handleOpenUser = (e) => setUserAnchor(e.currentTarget);
  const handleCloseUser = () => setUserAnchor(null);

  const handleMyProfile = () => {
    handleCloseUser();
    setProfileModalOpen(true);
  };

  const handleLogout = () => {
    handleCloseUser();
    logout();
  };

  // Fetch Notifications
  const fetchNotifications = async () => {
    try {
      const { notifications: list, unreadCount: count } = await notificationService.getAll();
      // Deduplicate notifications by ID to prevent usage of duplicate keys in the UI
      const uniqueList = Array.from(new Map(list.map(item => [item.id, item])).values());
      setNotifications(uniqueList);
      setUnreadCount(count);
    } catch (error) {
      // Ignora erros 401 - serão tratados pelo interceptor de auto-refresh
      if (error.response?.status !== 401) {
        console.error("Failed to fetch notifications", error);
      }
    }
  };

  // Mark as Read
  const handleMarkAsRead = async (id) => {
    try {
      await notificationService.markAsRead(id);
      fetchNotifications(); // Refresh
    } catch (error) {
      console.error(error);
    }
  };

  const handleNotificationClick = async (notif) => {
    if (!notif) return;
    try {
      if (!notif.isRead) {
        await notificationService.markAsRead(notif.id);
      }
    } catch (error) {
      console.error(error);
    } finally {
      handleCloseNotif();
      fetchNotifications();
      if (notif.link) {
        navigate(notif.link);
      }
    }
  };

  // Mark All as Read
  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      fetchNotifications();
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (!user) return;

    fetchNotifications();

    let es = null;
    let cancelled = false;

    (async () => {
      const streamUrl = await notificationService.getStreamUrl();
      if (cancelled || !streamUrl || typeof EventSource === 'undefined') return;
      try {
        es = new EventSource(streamUrl);
        es.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'notification' || data.type === 'connected') {
              fetchNotifications();
            }
          } catch {
            fetchNotifications();
          }
        };
        es.onerror = () => {
          try {
            es?.close();
          } catch {
            /* ignore */
          }
          es = null;
        };
      } catch {
        es = null;
      }
    })();

    const pollMs = 60000;
    const interval = setInterval(fetchNotifications, pollMs);

    return () => {
      cancelled = true;
      clearInterval(interval);
      try {
        es?.close();
      } catch {
        /* ignore */
      }
    };
  }, [user]);

  // Cmd+K / Ctrl+K — Command Palette
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Calculate sidebar width based on state
  const sidebarWidth = isMobile ? 0 : (sidebarCollapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED);

  return (
    <div style={{ display: 'flex', width: '100%', maxWidth: '100%', minWidth: 0 }}>
      <DarkSidebar
        isCollapsed={sidebarCollapsed}
        toggleSidebar={toggleSidebar}
        isMobile={isMobile}
        mobileOpen={mobileOpen}
        toggleMobile={handleDrawerToggle}
      />

      <div
        style={{
          marginLeft: `${sidebarWidth}px`,
          flex: '1 1 0%',
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          transition: 'margin-left 0.3s ease',
          overflowX: 'hidden',
          maxWidth: '100%',
          width: '100%',
          backgroundColor: mode === 'dark' ? '#0F172A' : '#F8FAFC',
        }}
      >
        <Box
          component="header"
          className="top-bar"
          sx={{
            backgroundColor: mode === 'dark' ? '#161d26' : 'background.paper', // Dynamic Background
            border: '1px solid',
            borderColor: 'divider', // Dynamic Border
            borderRadius: '8px', // Rounded corners
            mx: { xs: 2, md: 3 }, // Margins horizontal
            mt: { xs: 2, md: 3 }, // Margin top
            mb: 1, // Slight margin bottom
            height: { xs: '64px', md: '80px' },
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 24, // Sticks with gap from top
            zIndex: 1100,
            gap: { xs: 1, md: 2 },
            // hidden corta busca/breadcrumbs em zoom alto; X permite scroll raro se faltar espaço
            overflowX: 'auto',
            overflowY: 'hidden',
            // Removed maxWidth: 100% to allow margins to work properly relative to flex container
            boxSizing: 'border-box',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' // Subtle shadow
          }}
        >
          {/* Left: Hamburger + Breadcrumbs */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: '1 1 0%', minWidth: 0, overflow: 'hidden' }}>
            {isMobile && (
              <IconButton
                onClick={handleDrawerToggle}
                sx={{ color: '#64748b' }}
              >
                <MenuIcon />
              </IconButton>
            )}

            <Box sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center', color: 'text.secondary', fontSize: '0.875rem', fontWeight: 500, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              <span style={{ opacity: 0.7 }}>
                {(() => {
                  const path = location.pathname.split('/').filter(Boolean)[0] || '';
                  const systemRoutes = ['config', 'admin', 'activities'];
                  const helpRoutes = ['knowledge'];
                  if (systemRoutes.includes(path)) return 'Sistema';
                  if (helpRoutes.includes(path)) return 'Ajuda';
                  return 'Gestão';
                })()}
              </span>
              <span style={{ margin: '0 8px', opacity: 0.4 }}>/</span>
              <span style={{ color: mode === 'dark' ? '#f1f5f9' : '#0f172a', fontWeight: 600 }}>
                {(() => {
                  const routeLabelMap = {
                    dashboard: 'Visão Geral',
                    'modern-dashboard': 'Dashboard moderno',
                    projects: 'Projetos',
                    tasks: 'Tarefas',
                    finance: 'Financeiro',
                    contracts: 'Contratos',
                    suppliers: 'Fornecedores',
                    assets: 'Ativos',
                    changes: 'Gestão de Mudança',
                    risks: 'Riscos & Compliance',
                    incidents: 'Incidentes',
                    config: 'Configurações',
                    admin: 'Administração',
                    knowledge: 'Base de Conhecimento',
                    approvals: 'Minhas Aprovações',
                    activities: 'Atividade Recente',
                    report: 'Status Report',
                    portal: 'Portal de Suporte',
                    servicedesk: 'Service Desk',
                  };
                  const segment = location.pathname.split('/').filter(Boolean)[0] || '';
                  return routeLabelMap[segment] || 'Página';
                })()}
              </span>
            </Box>
          </Box>

          {/* Center: Global Search — Command Palette Trigger */}
          {!isMobile && (
            <Box
              onClick={() => setCommandPaletteOpen(true)}
              sx={{
                flex: '2 1 0%',
                minWidth: 0,
                maxWidth: 400,
                mx: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                px: 2,
                py: 1,
                borderRadius: '8px',
                border: '1px solid',
                borderColor: 'divider',
                cursor: 'pointer',
                transition: 'all 0.2s',
                bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
                '&:hover': { borderColor: 'rgba(59,130,246,0.4)', bgcolor: mode === 'dark' ? 'rgba(59,130,246,0.06)' : 'rgba(59,130,246,0.04)' },
              }}
            >
              <Typography sx={{ fontSize: '13px', color: 'text.disabled', flex: 1 }}>Buscar...</Typography>
              <Search sx={{ fontSize: 16, color: 'text.disabled' }} />
            </Box>
          )}

          {/* Right Side Actions Wrapper — não compete com flex:1 (evita esmagar centro em zoom 100%) */}
          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', justifyContent: 'flex-end', flex: '0 0 auto', flexShrink: 0, ml: isMobile ? 'auto' : { xs: 1, md: 2 } }}>
            {/* Theme Toggle */}
            <Tooltip title={mode === 'dark' ? "Mudar para Modo Claro" : "Mudar para Modo Escuro"}>
              <IconButton onClick={toggleTheme} className="top-bar-icon">
                {mode === 'dark' ? <LightMode /> : <DarkMode />}
              </IconButton>
            </Tooltip>

            <Tooltip title="Notificações">
              <IconButton className="top-bar-icon" onClick={handleOpenNotif}>
                <Badge badgeContent={unreadCount} color="error" variant="dot" invisible={unreadCount === 0}>
                  <Notifications />
                </Badge>
              </IconButton>
            </Tooltip>

            <Box
              onClick={handleOpenUser}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: { xs: 0, sm: 1.5 },
                px: { xs: 0.5, sm: 1.5 },
                ml: 1,
                py: 0.75,
                background: { xs: 'transparent', sm: mode === 'dark' ? '#1c2632' : 'transparent' },
                border: { xs: 'none', sm: '1px solid' },
                borderColor: 'divider',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                '&:hover': {
                  borderColor: 'rgba(37, 99, 235, 0.3)',
                },
              }}
            >
              <Avatar
                sx={{
                  width: { xs: 32, sm: 36 },
                  height: { xs: 32, sm: 36 },
                  background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
                  fontSize: { xs: 12, sm: 14 },
                  fontWeight: 600,
                  boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
                }}
              >
                {user?.name?.charAt(0) || 'U'}
              </Avatar>
              <Box sx={{ textAlign: 'left', display: { xs: 'none', sm: 'block' } }}>
                <Box sx={{ fontSize: '13px', fontWeight: 600, color: 'text.primary', lineHeight: 1.2, whiteSpace: 'nowrap' }}>
                  {user?.name || 'Usuário'}
                </Box>
              </Box>
            </Box>
          </Box>
        </Box>

        <main className={`page-content ${mode === 'dark' ? 'dark-premium-theme' : 'light-premium-theme'}`} style={{
          padding: 0,
          background: mode === 'dark' ? '#0f172a' : '#f8fafc', // Explicit background color
          minHeight: 'calc(100vh - 80px)'
        }}>
          <PageTransition>{children}</PageTransition>
        </main>

        {/* ... menus notificacoes ... */}
        <Menu
          anchorEl={notifAnchor}
          open={Boolean(notifAnchor)}
          onClose={handleCloseNotif}
          disableScrollLock
          PaperProps={{
            elevation: 0,
            sx: {
              filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.15))',
              mt: 1.5,
              width: 320,
              maxHeight: 400,
              overflowY: 'auto',
              borderRadius: '8px',
              border: '1px solid',
              borderColor: 'divider',
            },
          }}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        >
          <Box sx={{ p: 2, borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="subtitle2" fontWeight="bold">Notificações</Typography>
            {unreadCount > 0 && (
              <Typography variant="caption" color="primary" sx={{ cursor: 'pointer' }} onClick={handleMarkAllAsRead}>
                Marcar todas como lidas
              </Typography>
            )}
          </Box>

          {notifications.length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">Nenhuma notificação</Typography>
            </Box>
          ) : (
            notifications.map((notif) => (
              <MenuItem
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                sx={{
                  backgroundColor: notif.isRead ? 'transparent' : (mode === 'dark' ? 'rgba(59, 130, 246, 0.15)' : '#f8fafc')
                }}
              >
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, width: '100%' }}>
                  <Typography variant="body2" fontWeight={notif.isRead ? "400" : "600"}>{notif.title}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'normal' }}>{notif.message}</Typography>
                  <Typography variant="caption" color={notif.type === 'ERROR' ? 'error' : 'primary'} fontSize="10px">
                    {formatRelative(notif.createdAt)}
                  </Typography>
                </Box>
              </MenuItem>
            ))
          )}

          <Divider />
          <Box sx={{ p: 1, textAlign: 'center' }}>
            <Typography
              variant="caption"
              sx={{ cursor: 'pointer', color: 'primary.main', fontWeight: 600 }}
              onClick={() => {
                handleCloseNotif();
                setNotificationsModalOpen(true);
              }}
            >
              Ver todas
            </Typography>
          </Box>
        </Menu>

        <Menu
          anchorEl={userAnchor}
          open={Boolean(userAnchor)}
          onClose={handleCloseUser}
          disableScrollLock
          PaperProps={{
            elevation: 0,
            sx: {
              filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.15))',
              mt: 1.5, borderRadius: '8px',
              width: userAnchor?.offsetWidth || 200,
              border: '1px solid',
              borderColor: 'divider',
            },
          }}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        >
          <MenuItem onClick={handleMyProfile}>
            <ListItemIcon><Person fontSize="small" /></ListItemIcon>
            Meu Perfil
          </MenuItem>
          {/* Configurações apenas para Super Admin */}
          {user?.roles?.some(r => r.name === 'Super Admin') && (
            <MenuItem onClick={() => { handleCloseUser(); navigate('/config/organization'); }}>
              <ListItemIcon><Settings fontSize="small" /></ListItemIcon>
              Configurações
            </MenuItem>
          )}
          <Divider />
          <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
            <ListItemIcon><Logout fontSize="small" color="error" /></ListItemIcon>
            Sair
          </MenuItem>
        </Menu>

        {/* Modal de Perfil */}
        {user && (
          <UserModal
            open={profileModalOpen}
            onClose={() => setProfileModalOpen(false)}
            editData={user}
            isProfileMode={true}
            onSuccess={() => {
              setProfileModalOpen(false);
              enqueueSnackbar('Perfil atualizado com sucesso! Você será redirecionado para o login.', {
                variant: 'success',
                autoHideDuration: 2000
              });
              // Delay para o usuário ler a mensagem antes do logout
              setTimeout(() => {
                logout();
              }, 2000);
            }}
          />
        )}

        <NotificationsModal
          open={notificationsModalOpen}
          onClose={() => setNotificationsModalOpen(false)}
          onMarkAllRead={handleMarkAllAsRead}
        />

        <CommandPalette
          open={commandPaletteOpen}
          onClose={() => setCommandPaletteOpen(false)}
        />
      </div>
    </div>
  );
};

export default MainLayout;
