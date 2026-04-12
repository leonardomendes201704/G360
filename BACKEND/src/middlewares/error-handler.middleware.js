const multer = require('multer');
const { AppError, ValidationError: AppValidationError } = require('../errors');

const errorHandler = (err, req, res, next) => {
    // 1. Multer file size error
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
            status: 'error',
            statusCode: 413,
            errorCode: 'FILE_TOO_LARGE',
            message: 'Arquivo excede o limite de 25MB.'
        });
    }

    // 2. Yup validation errors
    if (err.name === 'ValidationError' && err.inner) {
        const errors = err.inner.map(e => e.message);
        return res.status(422).json({
            status: 'error',
            statusCode: 422,
            errorCode: 'VALIDATION_ERROR',
            message: errors.join('; '),
            errors
        });
    }

    // 3. Prisma unique constraint violation
    if (err.code === 'P2002') {
        const field = err.meta?.target?.join(', ') || 'campo';
        return res.status(409).json({
            status: 'error',
            statusCode: 409,
            errorCode: 'CONFLICT',
            message: `Valor duplicado para: ${field}.`
        });
    }

    // 4. Our custom AppError hierarchy
    if (err instanceof AppError) {
        const response = {
            status: 'error',
            statusCode: err.statusCode,
            errorCode: err.errorCode,
            message: err.message
        };
        // Include validation details if available
        if (err.errors) {
            response.errors = err.errors;
        }
        return res.status(err.statusCode).json(response);
    }

    // 5. Unknown/programming errors
    console.error('[Unhandled Error]:', err);

    const statusCode = err.statusCode || 500;
    const message = statusCode === 500
        ? 'Erro interno do servidor'
        : err.message;

    return res.status(statusCode).json({
        status: 'error',
        statusCode,
        errorCode: 'INTERNAL_ERROR',
        message
    });
};

module.exports = errorHandler;
