const AppError = require('./AppError');

class ForbiddenError extends AppError {
    /**
     * @param {string} [message] - Custom message (default: generic)
     */
    constructor(message = 'Acesso negado. Permissão insuficiente.') {
        super(message, 403, 'FORBIDDEN');
    }
}

module.exports = ForbiddenError;
