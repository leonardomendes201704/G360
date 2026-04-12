import axios from 'axios';

// Base URL da API - Dinâmica para funcionar em todos os dispositivos
// Usa o mesmo hostname que o navegador está acessando + porta 3001
const getBaseURL = () => {
  // Se VITE_API_URL estiver definido, usar ele
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  // Usar o mesmo hostname do navegador apontando para a porta 8500
  // Isso funciona para localhost, IPs locais (10.x, 192.168.x) e qualquer rede
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;
  return `${protocol}//${hostname}:8500/api/v1`;
};

const BASE_URL = getBaseURL();

// Cliente Axios
const api = axios.create({
  baseURL: BASE_URL,
});

// Variáveis para controle de refresh
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

// Interceptor de Request - Adiciona token e tenant slug em todas as requisições
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('g360_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Multi-tenant: enviar slug do tenant no header
    const tenantSlug = localStorage.getItem('g360_tenant_slug');
    if (tenantSlug) {
      config.headers['X-Tenant-Slug'] = tenantSlug;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Função para disparar logout via evento (evita hard reload)
const triggerSessionExpired = () => {
  window.dispatchEvent(new CustomEvent('auth:session-expired'));
};

// Interceptor de Response - Auto-refresh quando JWT expira
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Proteção contra loops infinitos - máximo 1 retry
    if (!originalRequest._retryCount) {
      originalRequest._retryCount = 0;
    }

    // Se erro 401, não é retry e ainda não tentamos refresh
    // Se a requisição pedir para pular verificação de auth (ex: login), ignora interceptor
    if (error.response?.status === 401 && originalRequest._retryCount < 1 && !originalRequest._skipAuthCheck) {
      originalRequest._retryCount += 1;

      if (isRefreshing) {
        // Se já está refreshing, adicionar à fila
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(token => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            // Usar axios diretamente com a URL completa para evitar re-interceptação
            return axios({
              ...originalRequest,
              url: originalRequest.url.startsWith('http')
                ? originalRequest.url
                : `${BASE_URL}${originalRequest.url}`
            });
          })
          .catch(err => Promise.reject(err));
      }

      isRefreshing = true;

      const refreshToken = localStorage.getItem('g360_refresh_token');

      if (!refreshToken) {
        isRefreshing = false;
        // Sem refresh token - notificar logout via evento
        console.info('[Auth] Sessão expirada (sem refresh token). Redirecionando para login...');
        localStorage.removeItem('g360_token');
        localStorage.removeItem('g360_refresh_token');
        localStorage.removeItem('g360_user');
        triggerSessionExpired();
        return Promise.reject(error);
      }

      try {
        // Chamar endpoint /refresh (usando axios puro, não o api)
        const response = await axios.post(`${BASE_URL}/auth/refresh`, {
          refreshToken
        });

        const { token: newToken } = response.data;

        // Salvar novo JWT
        localStorage.setItem('g360_token', newToken);

        // Atualizar defaults do api para futuras requisições
        api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;

        console.info('[Auth] Token renovado com sucesso.');

        // Atualizar header da requisição original
        originalRequest.headers.Authorization = `Bearer ${newToken}`;

        // Processar fila de requisições que falharam
        processQueue(null, newToken);

        // Retentar requisição original usando axios diretamente (evita loop)
        return axios({
          ...originalRequest,
          url: originalRequest.url.startsWith('http')
            ? originalRequest.url
            : `${BASE_URL}${originalRequest.url}`
        });

      } catch (refreshError) {
        // Refresh falhou - notificar logout via evento
        console.info('[Auth] Não foi possível renovar a sessão. Redirecionando para login...');
        processQueue(refreshError, null);
        localStorage.removeItem('g360_token');
        localStorage.removeItem('g360_refresh_token');
        localStorage.removeItem('g360_user');
        triggerSessionExpired();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;