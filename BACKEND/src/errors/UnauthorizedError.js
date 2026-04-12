const AppError = require('./AppError');

class UnauthorizedError extends AppError {
    /**
     * @param {string} [message] - Custom message (default: generic)
     */
    constructor(message = 'Credenciais inválidas ou token expirado.') {
        super(message, 401, 'UNAUTHORIZED');
    }
}

module.exports = UnauthorizedError;
