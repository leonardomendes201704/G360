const yup = require('yup');

/**
 * Express middleware factory for Yup schema validation.
 * Validates req.body against the provided schema.
 * 
 * Usage in routes:
 *   const { validate } = require('../middlewares/validate.middleware');
 *   const { createProjectSchema } = require('../validators/project.validator');
 *   router.post('/', auth, validate(createProjectSchema), controller.create);
 * 
 * @param {yup.ObjectSchema} schema - Yup schema to validate against
 * @param {'body'|'query'|'params'} source - Request property to validate (default: 'body')
 */
const validate = (schema, source = 'body') => {
    return async (req, res, next) => {
        try {
            const validated = await schema.validate(req[source], {
                abortEarly: false,   // Collect all errors, not just the first
                stripUnknown: true   // Remove fields not in the schema
            });
            req[source] = validated; // Replace with clean, validated data
            next();
        } catch (err) {
            if (err instanceof yup.ValidationError) {
                const errors = err.inner.map(e => ({
                    field: e.path,
                    message: e.message
                }));
                return res.status(422).json({
                    status: 'error',
                    statusCode: 422,
                    errorCode: 'VALIDATION_ERROR',
                    message: errors.map(e => e.message).join('; '),
                    errors
                });
            }
            next(err);
        }
    };
};

module.exports = { validate };
