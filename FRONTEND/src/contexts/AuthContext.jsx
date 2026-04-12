import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import axios from 'axios';
import api from '../services/api';
import { useSnackbar } from 'notistack';
import { rolesMatchGranularPermission } from '../utils/rbacPermissions';

function normalizeUserRoles(user) {
    if (!user) return [];
    if (Array.isArray(user.roles) && user.roles.length) return user.roles;
    if (user.role) {
        if (typeof user.role === 'string') return [{ name: user.role, permissions: user.permissions || [] }];
        return [user.role];
    }
    return [];
}

export const AuthContext = createContext();

// Tempo antes da expiração para renovar (2 minutos em ms)
const REFRESH_THRESHOLD_MS = 2 * 60 * 1000;
// Intervalo de verificação do token (30 segundos)
const TOKEN_CHECK_INTERVAL_MS = 30 * 1000;
// Timeout de inatividade (30 minutos)
const IDLE_TIMEOUT_MS = 30 * 60 * 1000;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const refreshTimerRef = useRef(null);
  const idleTimerRef = useRef(null);

  // Função para renovar o token proativamente
  const proactiveRefresh = useCallback(async () => {
    const token = localStorage.getItem('g360_token');
    const refreshToken = localStorage.getItem('g360_refresh_token');

    if (!token || !refreshToken) return;

    try {
      const decoded = jwtDecode(token);
      const expiresAt = decoded.exp * 1000; // converter para ms
      const now = Date.now();
      const timeUntilExpiry = expiresAt - now;

      // Se falta menos de 2 minutos para expirar, renovar agora
      if (timeUntilExpiry <= REFRESH_THRESHOLD_MS && timeUntilExpiry > 0) {
        console.info('[Auth] Token expira em breve, renovando proativamente...');

        const baseURL = api.defaults.baseURL;
        const response = await axios.post(`${baseURL}/auth/refresh`, { refreshToken });
        const { token: newToken } = response.data;

        // Salvar novo token
        localStorage.setItem('g360_token', newToken);
        api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;

        console.info('[Auth] Token renovado proativamente com sucesso.');
      }
    } catch (error) {
      console.warn('[Auth] Falha no refresh proativo:', error.message);
      // Não fazer nada - deixar o interceptor lidar se necessário
    }
  }, []);

  // Iniciar/parar timer de verificação do token
  const startTokenRefreshTimer = useCallback(() => {
    // Limpar timer existente
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
    }

    // Verificar imediatamente
    proactiveRefresh();

    // Configurar verificação periódica
    refreshTimerRef.current = setInterval(proactiveRefresh, TOKEN_CHECK_INTERVAL_MS);
  }, [proactiveRefresh]);

  const stopTokenRefreshTimer = useCallback(() => {
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    const recoverUserSession = () => {
      const recoveredUser = localStorage.getItem('g360_user');
      const token = localStorage.getItem('g360_token');
      const refreshToken = localStorage.getItem('g360_refresh_token');

      if (recoveredUser && token && refreshToken) {
        try {
          const parsedUser = JSON.parse(recoveredUser);
          setUser(parsedUser);
          api.defaults.headers.Authorization = `Bearer ${token}`;

          // Iniciar timer de refresh proativo
          startTokenRefreshTimer();
        } catch (error) {
          console.warn("Sessão inválida, limpando storage:", error);
          softLogout();
        }
      }
      setLoading(false);
    };

    recoverUserSession();

    // Cleanup no unmount
    return () => stopTokenRefreshTimer();
  }, [startTokenRefreshTimer, stopTokenRefreshTimer]);

  // Logout suave (sem chamar API - usado quando sessão já expirou)
  const softLogout = useCallback(() => {
    stopTokenRefreshTimer();
    localStorage.removeItem('g360_user');
    localStorage.removeItem('g360_token');
    localStorage.removeItem('g360_refresh_token');
    localStorage.removeItem('g360_tenant_slug');
    api.defaults.headers.Authorization = null;
    setUser(null);
    navigate('/login');
  }, [navigate, stopTokenRefreshTimer]);

  // Escutar evento de sessão expirada do interceptor
  useEffect(() => {
    const handleSessionExpired = () => {
      console.info('[AuthContext] Recebido evento de sessão expirada');
      softLogout();
    };

    window.addEventListener('auth:session-expired', handleSessionExpired);
    return () => {
      window.removeEventListener('auth:session-expired', handleSessionExpired);
    };
  }, [softLogout]);

  // ═══════ Idle Timeout (Inatividade) ═══════
  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (!user) return;
    idleTimerRef.current = setTimeout(() => {
      enqueueSnackbar('Sessão encerrada por inatividade.', { variant: 'warning', autoHideDuration: 5000 });
      softLogout();
    }, IDLE_TIMEOUT_MS);
  }, [user, softLogout, enqueueSnackbar]);

  useEffect(() => {
    if (!user) {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      return;
    }

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    const handler = () => resetIdleTimer();

    events.forEach(ev => window.addEventListener(ev, handler, { passive: true }));
    resetIdleTimer(); // start the timer

    return () => {
      events.forEach(ev => window.removeEventListener(ev, handler));
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [user, resetIdleTimer]);

  const login = async (email, password, tenantSlug = null) => {
    try {
      const payload = { email, password };
      if (tenantSlug) {
        payload.tenantSlug = tenantSlug;
      }

      const response = await api.post('/auth/login', payload);

      // Handle multi-tenant selection scenario
      if (response.data.needsTenantSelection) {
        return { needsTenantSelection: true, tenants: response.data.tenants };
      }

      const { token, refreshToken, user: loggedUser, enabledModules } = response.data;

      if (loggedUser.roles && !Array.isArray(loggedUser.roles)) {
        console.warn('Roles format mismatch', loggedUser.roles);
      }

      const userWithModules = { ...loggedUser, enabledModules: enabledModules || null };

      localStorage.setItem('g360_user', JSON.stringify(userWithModules));
      localStorage.setItem('g360_token', token);
      localStorage.setItem('g360_refresh_token', refreshToken);

      // Save tenant slug (from param or auto-detected via JWT)
      if (tenantSlug) {
        localStorage.setItem('g360_tenant_slug', tenantSlug);
      } else if (token) {
        // Extract slug from JWT for auto-detected logins
        try {
          const base64Payload = token.split('.')[1];
          const decoded = JSON.parse(atob(base64Payload));
          if (decoded.tenantSlug) {
            localStorage.setItem('g360_tenant_slug', decoded.tenantSlug);
          }
        } catch (_) { }
      }

      api.defaults.headers.Authorization = `Bearer ${token}`;
      setUser(userWithModules);

      startTokenRefreshTimer();

      enqueueSnackbar('Login realizado com sucesso!', { variant: 'success' });
      navigate('/dashboard');

      return { success: true };

    } catch (error) {
      console.error(error);
      const msg = error.response?.data?.error || error.response?.data?.message || 'Erro ao realizar login.';
      enqueueSnackbar(msg, { variant: 'error' });
      return { error: msg };
    }
  };

  const logout = async () => {
    try {
      const refreshToken = localStorage.getItem('g360_refresh_token');

      // Revogar refresh token no backend
      if (refreshToken) {
        await api.post('/auth/logout', { refreshToken });
      }
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    } finally {
      // Parar timer e limpar storage
      stopTokenRefreshTimer();
      localStorage.removeItem('g360_user');
      localStorage.removeItem('g360_token');
      localStorage.removeItem('g360_refresh_token');
      localStorage.removeItem('g360_tenant_slug');
      api.defaults.headers.Authorization = null;
      setUser(null);
      navigate('/login');
    }
  };

  const hasPermission = useCallback((module, action) => {
    if (!user || (!user.roles && !user.role && !user.roleId)) return false;
    const roles = normalizeUserRoles(user);
    if (!roles.length) return false;
    return rolesMatchGranularPermission(roles, module, action);
  }, [user]);

  return (
    <AuthContext.Provider value={{ authenticated: !!user, user, loading, login, logout, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};