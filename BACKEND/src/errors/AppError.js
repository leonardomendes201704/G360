/**
 * Base Error class for G360 application errors.
 * All custom errors should extend this class.
 */
class AppError extends Error {
    /**
     * @param {string} message - Human-readable error message
     * @param {number} statusCode - HTTP status code (default 500)
     * @param {string} errorCode - Machine-readable error code (e.g. 'RESOURCE_NOT_FOUND')
     */
    constructor(message, statusCode = 500, errorCode = 'INTERNAL_ERROR') {
        super(message);
        this.name = this.constructor.name;
        this.statusCode = statusCode;
        this.errorCode = errorCode;
        this.isOperational = true; // Distinguishes from programming errors
        Error.captureStackTrace(this, this.constructor);
    }
}

module.exports = AppError;
