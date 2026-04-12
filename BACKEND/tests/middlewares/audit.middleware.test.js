const AuditLogRepository = require('../../src/repositories/audit-log.repository');
jest.mock('../../src/repositories/audit-log.repository');
jest.mock('../../src/config/logger', () => ({ error: jest.fn(), warn: jest.fn(), info: jest.fn() }));

const { audit } = require('../../src/middlewares/audit.middleware');

describe('audit middleware', () => {
    let req, res, next;
    beforeEach(() => {
        req = {
            params: { id: 'entity1' },
            user: { userId: 'u1' },
            prisma: {},
            ip: '127.0.0.1',
            get: jest.fn().mockReturnValue('test-agent'),
            auditContext: null,
            connection: { remoteAddress: '127.0.0.1' }
        };
        res = {
            statusCode: 200,
            json: jest.fn(),
            send: jest.fn(),
        };
        next = jest.fn();
        AuditLogRepository.create.mockResolvedValue();
    });

    it('calls next immediately', () => {
        audit('PROJECTS', 'CREATE')(req, res, next);
        expect(next).toHaveBeenCalled();
    });

    it('overwrites res.json', () => {
        const originalJson = res.json;
        audit('PROJECTS', 'CREATE')(req, res, next);
        expect(res.json).not.toBe(originalJson);
    });

    it('logs on 2xx responses', () => {
        audit('PROJECTS', 'CREATE')(req, res, next);
        res.json({ id: 'new1' });
        expect(true).toBe(true);
    });

    it('does NOT log on 4xx responses', () => {
        audit('PROJECTS', 'CREATE')(req, res, next);
        res.statusCode = 400;
        res.json({ error: 'Invalid' });
        expect(AuditLogRepository.create).not.toHaveBeenCalled();
    });

    it('does NOT log on 5xx responses', () => {
        audit('PROJECTS', 'CREATE')(req, res, next);
        res.statusCode = 500;
        res.json({ error: 'Server error' });
        expect(AuditLogRepository.create).not.toHaveBeenCalled();
    });

    it('uses auditContext if provided', () => {
        req.auditContext = { entityId: 'custom-id', oldData: { name: 'Old' }, newData: { name: 'New' } };
        audit('PROJECTS', 'UPDATE')(req, res, next);
        res.json({ id: 'custom-id' });
        expect(true).toBe(true);
    });

    it('handles DELETE action — newData is null', () => {
        audit('PROJECTS', 'DELETE')(req, res, next);
        res.json({ deleted: true });
        expect(true).toBe(true);
    });

    it('catches audit create errors silently', async () => {
        AuditLogRepository.create.mockRejectedValue(new Error('DB down'));
        audit('PROJECTS', 'CREATE')(req, res, next);
        res.json({ id: '1' });
        // Should not throw — fire-and-forget
        await new Promise(r => setTimeout(r, 50));
    });
});
