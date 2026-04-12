/**
 * Extracts a user-friendly error message from an error object.
 * 
 * @param {any} error - The error object caught in a try/catch block.
 * @param {string} defaultMessage - A fallback message if no specific error is found.
 * @returns {string} The extracted error message.
 */
export const getErrorMessage = (error, defaultMessage = "Ocorreu um erro inesperado.") => {
    if (!error) return defaultMessage;

    // Axios error response
    if (error.response) {
        // Data usually contains the message from backend
        if (error.response.data) {
            if (typeof error.response.data === 'string') return error.response.data;
            if (error.response.data.message) return error.response.data.message;
            if (error.response.data.error) return error.response.data.error;
        }
        // Status code fallbacks
        if (error.response.status === 404) return "Recurso não encontrado.";
        if (error.response.status === 403) return "Você não tem permissão para realizar esta ação.";
        if (error.response.status === 401) return "Sessão expirada. Por favor, faça login novamente.";
        if (error.response.status === 500) return "Erro interno do servidor. Tente novamente mais tarde.";
    }

    // Network errors
    if (error.message === 'Network Error') {
        return "Erro de conexão. Verifique sua internet.";
    }

    // Standard Error object
    if (error.message) {
        return error.message;
    }

    return defaultMessage;
};
