const logger = require('../../src/config/logger');

jest.mock('../../src/config/logger', () => ({
    error: jest.fn(),
    warn: jest.fn(),
}));

const { securityLogger, logFailedLogin, logBlockedUpload, writeSecurityLog } = require('../../src/middlewares/security-logger.middleware');

describe('security-logger middleware', () => {
    let req, res, next;
    beforeEach(() => {
        jest.clearAllMocks();
        req = {
            ip: '192.168.1.1',
            method: 'POST',
            path: '/api/login',
            get: jest.fn((h) => (h === 'user-agent' ? 'TestAgent' : null)),
            user: { email: 'user@test.com' },
            connection: { remoteAddress: '192.168.1.1' },
        };
        res = {
            statusCode: 200,
            send: jest.fn(),
            json: jest.fn(),
        };
        next = jest.fn();
    });

    it('calls next', () => {
        securityLogger(req, res, next);
        expect(next).toHaveBeenCalled();
    });

    it('intercepts res.json and logs on 401', () => {
        securityLogger(req, res, next);
        res.statusCode = 401;
        res.json({ error: 'Unauthorized' });
        expect(logger.warn).toHaveBeenCalled();
    });

    it('intercepts res.send and logs on 403', () => {
        securityLogger(req, res, next);
        res.statusCode = 403;
        res.send('Forbidden');
        expect(logger.warn).toHaveBeenCalled();
    });

    it('logs on 429 rate limit', () => {
        securityLogger(req, res, next);
        res.statusCode = 429;
        res.json({ error: 'Too many requests' });
        expect(logger.warn).toHaveBeenCalled();
    });

    it('does NOT log on 200', () => {
        securityLogger(req, res, next);
        res.statusCode = 200;
        res.json({ ok: true });
        expect(logger.warn).not.toHaveBeenCalled();
    });
});

describe('logFailedLogin', () => {
    it('writes security log for failed login', () => {
        jest.clearAllMocks();
        const r = { ip: '10.0.0.1', get: jest.fn().mockReturnValue('Browser'), connection: { remoteAddress: '10.0.0.1' } };
        logFailedLogin(r, 'test@test.com', 'Invalid password');
        expect(logger.warn).toHaveBeenCalled();
    });
});

describe('logBlockedUpload', () => {
    it('writes security log for blocked upload', () => {
        jest.clearAllMocks();
        const r = { ip: '10.0.0.1', user: { email: 'admin@test.com' } };
        logBlockedUpload(r, 'malware.exe', 'application/x-executable', 'Extension not allowed');
        expect(logger.warn).toHaveBeenCalled();
    });
});

describe('writeSecurityLog', () => {
    it('delegates to logger.warn', () => {
        jest.clearAllMocks();
        writeSecurityLog({ type: 'TEST' });
        expect(logger.warn).toHaveBeenCalled();
    });
});
