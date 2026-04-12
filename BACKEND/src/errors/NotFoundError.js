const AppError = require('./AppError');

class NotFoundError extends AppError {
    /**
     * @param {string} resource - Name of the resource (e.g. 'Projeto', 'Usuário')
     * @param {string} [id] - Optional ID of the resource for context
     */
    constructor(resource = 'Recurso', id) {
        const message = id
            ? `${resource} com ID ${id} não encontrado.`
            : `${resource} não encontrado.`;
        super(message, 404, 'RESOURCE_NOT_FOUND');
    }
}

module.exports = NotFoundError;
