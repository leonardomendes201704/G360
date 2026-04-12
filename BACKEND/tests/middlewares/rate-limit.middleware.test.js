jest.mock('../../src/config/logger', () => ({ warn: jest.fn() }));

describe('rate-limit middleware', () => {
    const { loginLimiter, globalLimiter, strictLimiter, referenceLimiter } = require('../../src/middlewares/rate-limit.middleware');

    it('exports loginLimiter as a function', () => {
        expect(typeof loginLimiter).toBe('function');
    });

    it('exports globalLimiter as a function', () => {
        expect(typeof globalLimiter).toBe('function');
    });

    it('exports strictLimiter as a function', () => {
        expect(typeof strictLimiter).toBe('function');
    });

    it('exports referenceLimiter as a function', () => {
        expect(typeof referenceLimiter).toBe('function');
    });

    it('loginLimiter can be used as route middleware', () => {
        // express-rate-limit returns a middleware function with additional properties
        expect(loginLimiter).toBeDefined();
        expect(loginLimiter.length).toBeGreaterThanOrEqual(3); // (req, res, next)
    });
});
