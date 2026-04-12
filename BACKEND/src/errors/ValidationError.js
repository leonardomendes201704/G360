const AppError = require('./AppError');

class ValidationError extends AppError {
    /**
     * @param {string|string[]} errors - Validation error message(s)
     */
    constructor(errors) {
        const errorList = Array.isArray(errors) ? errors : [errors];
        super(errorList.join('; '), 422, 'VALIDATION_ERROR');
        this.errors = errorList;
    }
}

module.exports = ValidationError;
