const AppError = require('./AppError');

class ConflictError extends AppError {
    /**
     * @param {string} [message] - Custom message (default: generic)
     */
    constructor(message = 'Conflito: recurso já existe ou está em uso.') {
        super(message, 409, 'CONFLICT');
    }
}

module.exports = ConflictError;
