const jwt = require('jsonwebtoken');
const authMiddleware = require('../../src/middlewares/auth.middleware');

const SECRET = 'test-secret-key';
process.env.JWT_SECRET = SECRET;

const mockRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

describe('Auth Middleware', () => {
    it('should return 401 if no Authorization header', () => {
        const req = { headers: {} };
        const res = mockRes();
        const next = jest.fn();

        authMiddleware(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ message: 'Token não fornecido.' });
        expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 if Authorization header has wrong format', () => {
        const req = { headers: { authorization: 'InvalidFormat' } };
        const res = mockRes();
        const next = jest.fn();

        authMiddleware(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ message: 'Erro no formato do Token.' });
    });

    it('should return 401 if scheme is not Bearer', () => {
        const req = { headers: { authorization: 'Basic sometoken' } };
        const res = mockRes();
        const next = jest.fn();

        authMiddleware(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ message: 'Token mal formatado.' });
    });

    it('should return 401 if token is expired', () => {
        const token = jwt.sign({ userId: '1' }, SECRET, { expiresIn: '-1s' });
        const req = { headers: { authorization: `Bearer ${token}` } };
        const res = mockRes();
        const next = jest.fn();

        authMiddleware(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ message: 'Token inválido ou expirado.' });
    });

    it('should return 401 if token has wrong secret', () => {
        const token = jwt.sign({ userId: '1' }, 'wrong-secret', { expiresIn: '1h' });
        const req = { headers: { authorization: `Bearer ${token}` } };
        const res = mockRes();
        const next = jest.fn();

        authMiddleware(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ message: 'Token inválido ou expirado.' });
    });

    it('should populate req.user and call next() with valid token', () => {
        const payload = { userId: 'user-1', email: 'test@test.com', tenantSlug: 'demo', schemaName: 'demo' };
        const token = jwt.sign(payload, SECRET, { expiresIn: '1h' });
        const req = { headers: { authorization: `Bearer ${token}` } };
        const res = mockRes();
        const next = jest.fn();

        authMiddleware(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(req.user).toBeDefined();
        expect(req.user.userId).toBe('user-1');
        expect(req.user.email).toBe('test@test.com');
        expect(req.user.tenantSlug).toBe('demo');
    });

    it('should preserve all JWT payload fields', () => {
        const payload = {
            userId: 'u1', email: 'a@b.com', roles: ['admin'],
            tenantSlug: 'test', schemaName: 'test_schema'
        };
        const token = jwt.sign(payload, SECRET, { expiresIn: '1h' });
        const req = { headers: { authorization: `Bearer ${token}` } };
        const res = mockRes();
        const next = jest.fn();

        authMiddleware(req, res, next);

        expect(req.user.roles).toEqual(['admin']);
        expect(req.user.schemaName).toBe('test_schema');
    });
});
