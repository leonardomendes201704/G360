/**
 * Utilitários de URL - Para acesso dinâmico em rede local
 * Permite que a aplicação funcione tanto em localhost quanto em IPs da rede
 */

/**
 * Retorna a URL base do servidor backend (sem /api)
 * Usa o mesmo hostname do frontend, ajustando apenas a porta
 * 
 * IMPORTANTE: Para acesso de rede (não localhost), força HTTPS
 * porque Azure AD requer HTTPS para OAuth callbacks
 * 
 * @returns {string} URL base do servidor, ex: "https://10.0.8.53:3002"
 */
export const getServerBaseURL = () => {
    // Se VITE_API_URL estiver definido, extrair o servidor base
    if (import.meta.env.VITE_API_URL) {
        // Remove /api do final se existir
        return import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '');
    }

    const hostname = window.location.hostname;
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';

    // Para localhost: usar HTTP na porta 3001
    // Para rede: usar HTTPS na porta 3002 (necessário para Azure AD)
    if (isLocalhost) {
        return `http://${hostname}:3001`;
    } else {
        return `https://${hostname}:3002`;
    }
};

/**
 * Origem HTTP(S) onde o Express serve ficheiros estáticos (/uploads).
 * Alinha com a API (api.js / getUploadURL), não com getServerBaseURL (legado 3001/3002).
 */
const getStaticFilesOrigin = () => {
    if (import.meta.env.VITE_API_URL) {
        return import.meta.env.VITE_API_URL
            .replace(/\/api(?:\/v\d+)?\/?$/i, '')
            .replace(/\/$/, '');
    }
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    return `${protocol}//${hostname}:8500`;
};

/**
 * Constrói a URL completa para um arquivo/recurso do servidor
 *
 * @param {string} path - Caminho relativo do arquivo, ex: "/uploads/file.pdf"
 * @returns {string} URL completa na mesma origem da API (ex.: http://localhost:8500/uploads/...)
 */
export const getFileURL = (path) => {
    if (!path) return '';

    // Se já for uma URL completa, retornar como está
    if (path.startsWith('http://') || path.startsWith('https://')) {
        return path;
    }

    // Garantir que o path comece com /
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;

    return `${getStaticFilesOrigin()}${normalizedPath}`;
};

/**
 * Retorna a URL para upload de arquivos
 * Usa a mesma lógica de URL da API (porta 8500) em vez do getServerBaseURL (porta 3002)
 * @returns {string} URL completa para uploads
 */
export const getUploadURL = () => {
    if (import.meta.env.VITE_API_URL) {
        return `${import.meta.env.VITE_API_URL}/uploads`;
    }
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    return `${protocol}//${hostname}:8500/api/uploads`;
};

export default {
    getServerBaseURL,
    getFileURL,
    getUploadURL,
};
