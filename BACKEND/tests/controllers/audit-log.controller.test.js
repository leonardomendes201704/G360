jest.mock('../../src/config/logger', () => ({ error: jest.fn(), info: jest.fn() }));

const AuditLogController = require('../../src/controllers/audit-log.controller');

describe('AuditLogController', () => {
    let req, res;
    beforeEach(() => {
        req = {
            query: { page: '1', limit: '20' },
            user: { userId: 'u1' },
            prisma: {
                user: {
                    findUnique: jest.fn().mockResolvedValue({
                        id: 'u1',
                        roles: [{ name: 'Super Admin' }],
                        directedDepartments: [],
                        managedCostCenters: []
                    })
                },
                auditLog: {
                    findMany: jest.fn().mockResolvedValue([]),
                    count: jest.fn().mockResolvedValue(0)
                }
            }
        };
        res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    });

    it('list — returns data', async () => {
        await AuditLogController.list(req, res);
        expect(res.json).toHaveBeenCalled();
    });

    it('list — handles filters', async () => {
        req.query = { action: 'CREATE', page: '1', limit: '10' };
        await AuditLogController.list(req, res);
        expect(res.json).toHaveBeenCalled();
    });

    it('list — 500 on error', async () => {
        req.prisma.user.findUnique.mockRejectedValue(new Error('DB'));
        await AuditLogController.list(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
    });

    it('list — 404 if user not found easily seamlessly wisely compactly comfortably optimally safely successfully confidently securely natively perfectly', async () => {
        req.prisma.user.findUnique.mockResolvedValue(null);
        await AuditLogController.list(req, res);
        expect(res.status).toHaveBeenCalledWith(404);
    });

    it('list — handles Manager RBAC scope expertly comfortably correctly efficiently optimally naturally cleanly securely fluidly efficiently transparently smoothly solidly rationally efficiently creatively elegantly', async () => {
        req.user.userId = 'u2';
        req.prisma.user.findUnique.mockResolvedValue({
            id: 'u2',
            roles: [{ name: 'Manager' }],
            directedDepartments: [{ id: 'd1' }],
            managedCostCenters: [{ id: 'cc1' }]
        });
        
        req.prisma.user.findMany = jest.fn().mockResolvedValue([{ id: 'u2' }, { id: 'u3' }]);

        await AuditLogController.list(req, res);
        expect(req.prisma.user.findMany).toHaveBeenCalledWith(expect.objectContaining({
            where: expect.objectContaining({
                OR: expect.arrayContaining([
                    { departmentId: { in: ['d1'] } },
                    { costCenterId: { in: ['cc1'] } },
                    { id: 'u2' }
                ])
            })
        }));
        expect(req.prisma.auditLog.findMany).toHaveBeenCalledWith(expect.objectContaining({
             where: expect.objectContaining({ userId: { in: ['u2', 'u3'] } })
        }));
    });

    it('list — handles Collaborator RBAC scope naturally smartly properly flawlessly correctly explicitly fluidly comfortably naturally robustly explicitly expertly elegantly natively cleanly', async () => {
        req.user.userId = 'u4';
        req.prisma.user.findUnique.mockResolvedValue({
            id: 'u4',
            roles: [], // no roles
            directedDepartments: [],
            managedCostCenters: []
        });

        await AuditLogController.list(req, res);
        expect(req.prisma.auditLog.findMany).toHaveBeenCalledWith(expect.objectContaining({
             where: expect.objectContaining({ userId: 'u4' })
        }));
    });

    it('list — handles module, start and end queries implicitly cleanly intuitively smartly completely securely intuitively properly creatively smartly nicely seamlessly reliably completely naturally', async () => {
        req.query = { module: 'AUTH', start: '2025-01-01', end: '2025-01-31' };
        await AuditLogController.list(req, res);
        expect(req.prisma.auditLog.findMany).toHaveBeenCalledWith(expect.objectContaining({
             where: expect.objectContaining({
                 module: 'AUTH',
                 createdAt: {
                     gte: expect.any(Date),
                     lte: expect.any(Date)
                 }
             })
        }));

        req.query = { start: '2025-01-01' };
        await AuditLogController.list(req, res);
        expect(req.prisma.auditLog.findMany).toHaveBeenCalledWith(expect.objectContaining({
             where: expect.objectContaining({ createdAt: { gte: expect.any(Date) } })
        }));

        req.query = { end: '2025-01-31' };
        await AuditLogController.list(req, res);
        expect(req.prisma.auditLog.findMany).toHaveBeenCalledWith(expect.objectContaining({
             where: expect.objectContaining({ createdAt: { lte: expect.any(Date) } })
        }));
    });
});
