const yup = require('yup');
const { validate } = require('../../src/middlewares/validate.middleware');

const mockRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

describe('Validate Middleware', () => {
    const schema = yup.object().shape({
        name: yup.string().required('Nome é obrigatório'),
        email: yup.string().email('Email inválido').required('Email é obrigatório'),
        age: yup.number().positive().integer(),
    });

    it('should call next() with valid data', async () => {
        const middleware = validate(schema);
        const req = { body: { name: 'Test', email: 'test@test.com' } };
        const res = mockRes();
        const next = jest.fn();

        await middleware(req, res, next);

        expect(next).toHaveBeenCalledWith();
        expect(req.body.name).toBe('Test');
    });

    it('should strip unknown fields', async () => {
        const middleware = validate(schema);
        const req = { body: { name: 'Test', email: 'test@test.com', extraField: 'hack' } };
        const res = mockRes();
        const next = jest.fn();

        await middleware(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(req.body.extraField).toBeUndefined();
    });

    it('should return 422 with validation errors', async () => {
        const middleware = validate(schema);
        const req = { body: {} };
        const res = mockRes();
        const next = jest.fn();

        await middleware(req, res, next);

        expect(res.status).toHaveBeenCalledWith(422);
        const call = res.json.mock.calls[0][0];
        expect(call.status).toBe('error');
        expect(call.statusCode).toBe(422);
        expect(call.errorCode).toBe('VALIDATION_ERROR');
        expect(call.errors).toBeDefined();
        expect(call.errors.length).toBeGreaterThan(0);
    });

    it('should collect all errors (abortEarly: false)', async () => {
        const middleware = validate(schema);
        const req = { body: {} }; // missing name and email
        const res = mockRes();
        const next = jest.fn();

        await middleware(req, res, next);

        const errors = res.json.mock.calls[0][0].errors;
        const fields = errors.map(e => e.field);
        expect(fields).toContain('name');
        expect(fields).toContain('email');
    });

    it('should validate query params when source is "query"', async () => {
        const querySchema = yup.object().shape({
            page: yup.number().required('Page é obrigatório'),
        });
        const middleware = validate(querySchema, 'query');
        const req = { query: { page: 1 } };
        const res = mockRes();
        const next = jest.fn();

        await middleware(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(req.query.page).toBe(1);
    });

    it('should reject query params with invalid data', async () => {
        const querySchema = yup.object().shape({
            page: yup.number().required('Page é obrigatório'),
        });
        const middleware = validate(querySchema, 'query');
        const req = { query: {} };
        const res = mockRes();
        const next = jest.fn();

        await middleware(req, res, next);

        expect(res.status).toHaveBeenCalledWith(422);
    });

    it('should include error messages in response message field', async () => {
        const middleware = validate(schema);
        const req = { body: { name: 'Test' } }; // missing email
        const res = mockRes();
        const next = jest.fn();

        await middleware(req, res, next);

        const response = res.json.mock.calls[0][0];
        expect(response.message).toContain('Email é obrigatório');
    });
});
