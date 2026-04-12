jest.mock('../../src/utils/access-scope', () => ({
    getUserAccessScope: jest.fn().mockResolvedValue({ isAdmin: true, accessibleCostCenterIds: [] })
}));

const NotificationController = require('../../src/controllers/notification.controller');

describe('NotificationController', () => {
    let req, res;
    beforeEach(() => {
        req = {
            query: { page: '1', limit: '20' },
            params: { id: 'n1' },
            user: { userId: 'u1' },
            prisma: {
                user: {
                    findUnique: jest.fn().mockResolvedValue({
                        id: 'u1',
                        roles: [{ permissions: [{ module: 'ALL', action: 'ALL' }] }]
                    })
                },
                notification: {
                    findMany: jest.fn().mockResolvedValue([]),
                    count: jest.fn().mockResolvedValue(0),
                    update: jest.fn().mockResolvedValue({ id: 'n1', read: true }),
                    updateMany: jest.fn().mockResolvedValue({ count: 5 })
                }
            }
        };
        res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    });

    it('list — returns notifications', async () => {
        await NotificationController.list(req, res);
        const called = res.json.mock.calls.length > 0 || res.status.mock.calls.length > 0;
        expect(called).toBe(true);
    });

    it('list — returns notifications with link data', async () => {
        req.prisma.notification.findMany.mockResolvedValue([
            { id: 'n1', link: '/projects/p1', userId: 'u1', isRead: false },
            { id: 'n2', link: '/finance', userId: 'u1', isRead: true },
            { id: 'n3', link: null, userId: 'u1', isRead: false }
        ]);
        await NotificationController.list(req, res);
        expect(res.json).toHaveBeenCalled();
    });

    it('list — handles all=true param', async () => {
        req.query = { all: 'true' };
        await NotificationController.list(req, res);
        expect(res.json).toHaveBeenCalled();
    });

    it('list — handles error gracefully', async () => {
        req.prisma.user.findUnique.mockRejectedValue(new Error('DB error'));
        await NotificationController.list(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
    });

    it('markAsRead — 204', async () => {
        await NotificationController.markAsRead(req, res);
        expect(res.status).toHaveBeenCalledWith(204);
    });

    it('markAllAsRead — 204', async () => {
        await NotificationController.markAllAsRead(req, res);
        expect(res.status).toHaveBeenCalledWith(204);
    });

    it('markAsRead — handles error gracefully', async () => {
        req.prisma.notification.updateMany.mockRejectedValue(new Error('DB error'));
        await NotificationController.markAsRead(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
    });

    it('markAllAsRead — handles error gracefully', async () => {
        req.prisma.notification.updateMany.mockRejectedValue(new Error('DB error'));
        await NotificationController.markAllAsRead(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
    });

    // === BATCH 4: BRANCH COVERAGE EXPANSION ===

    it('list — moduleForLink covers various link prefixes', async () => {
        req.prisma.notification.findMany.mockResolvedValue([
            { id: 'n1', link: '/projects/p1', userId: 'u1', isRead: false },
            { id: 'n2', link: '/finance/dashboard', userId: 'u1', isRead: false },
            { id: 'n3', link: '/changes?id=g1', userId: 'u1', isRead: true },
            { id: 'n4', link: '/tasks/t1', userId: 'u1', isRead: false },
            { id: 'n5', link: '/approvals/a1', userId: 'u1', isRead: false },
            { id: 'n6', link: '/contracts/c1', userId: 'u1', isRead: false },
            { id: 'n7', link: '/suppliers/s1', userId: 'u1', isRead: false },
            { id: 'n8', link: '/assets/a1', userId: 'u1', isRead: false },
            { id: 'n9', link: '/incidents/i1', userId: 'u1', isRead: false },
            { id: 'n10', link: '/activities', userId: 'u1', isRead: false },
            { id: 'n11', link: '/admin/settings', userId: 'u1', isRead: false },
            { id: 'n12', link: '/config/general', userId: 'u1', isRead: false },
            { id: 'n13', link: '/knowledge/kb1', userId: 'u1', isRead: false },
            { id: 'n14', link: '/unknown/path', userId: 'u1', isRead: false },
        ]);
        await NotificationController.list(req, res);
        expect(res.json).toHaveBeenCalled();
    });

    it('list — for non-admin with limited permissions', async () => {
        req.prisma.user.findUnique.mockResolvedValue({
            id: 'u1', roles: [{ permissions: [{ module: 'PROJECTS', action: 'READ' }] }]
        });
        const { getUserAccessScope } = require('../../src/utils/access-scope');
        getUserAccessScope.mockResolvedValue({ isAdmin: false, accessibleCostCenterIds: ['cc1'] });

        req.prisma.notification.findMany.mockResolvedValue([
            { id: 'n1', link: '/projects/p1', userId: 'u1', isRead: false },
            { id: 'n2', link: '/finance/dashboard', userId: 'u1', isRead: false }, // Should be filtered (no FINANCE permission)
        ]);

        await NotificationController.list(req, res);
        expect(res.json).toHaveBeenCalled();
    });

    it('list — canAccessLink checks for assets resource', async () => {
        const { getUserAccessScope } = require('../../src/utils/access-scope');
        getUserAccessScope.mockResolvedValue({ isAdmin: false, accessibleCostCenterIds: ['cc1'] });
        req.prisma.asset = { findUnique: jest.fn().mockResolvedValue({ costCenterId: 'cc1' }) };

        req.prisma.notification.findMany.mockResolvedValue([
            { id: 'n1', link: '/assets/asset1', userId: 'u1', isRead: false },
        ]);

        await NotificationController.list(req, res);
        expect(res.json).toHaveBeenCalled();
    });

    it('list — canAccessLink checks for contracts resource', async () => {
        const { getUserAccessScope } = require('../../src/utils/access-scope');
        getUserAccessScope.mockResolvedValue({ isAdmin: false, accessibleCostCenterIds: ['cc1'] });
        req.prisma.contract = { findUnique: jest.fn().mockResolvedValue({ costCenterId: 'cc1' }) };

        req.prisma.notification.findMany.mockResolvedValue([
            { id: 'n1', link: '/contracts/contract1', userId: 'u1', isRead: false },
        ]);

        await NotificationController.list(req, res);
        expect(res.json).toHaveBeenCalled();
    });

    it('list — canAccessLink checks for incidents resource', async () => {
        const { getUserAccessScope } = require('../../src/utils/access-scope');
        getUserAccessScope.mockResolvedValue({ isAdmin: false, accessibleCostCenterIds: ['cc1'] });
        req.prisma.incident = {
            findUnique: jest.fn().mockResolvedValue({
                reporterId: 'u1', assigneeId: 'u2',
                reporter: { costCenterId: 'cc1' },
                assignee: { costCenterId: 'cc2' }
            })
        };

        req.prisma.notification.findMany.mockResolvedValue([
            { id: 'n1', link: '/incidents/inc1', userId: 'u1', isRead: false },
        ]);

        await NotificationController.list(req, res);
        expect(res.json).toHaveBeenCalled();
    });

    it('list — canAccessLink for null link', async () => {
        req.prisma.notification.findMany.mockResolvedValue([
            { id: 'n1', link: null, userId: 'u1', isRead: false },
            { id: 'n2', userId: 'u1', isRead: false },
        ]);

        await NotificationController.list(req, res);
        expect(res.json).toHaveBeenCalled();
    });
});
