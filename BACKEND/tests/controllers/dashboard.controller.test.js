const DashboardController = require('../../src/controllers/dashboard.controller');
const DashboardService = require('../../src/services/dashboard.service');
const accessScope = require('../../src/utils/access-scope');

jest.mock('../../src/services/dashboard.service');
jest.mock('../../src/utils/access-scope');

const mockResponse = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

const mockRequest = (overrides = {}) => ({
    query: {},
    params: {},
    user: { userId: 'u1' },
    prisma: {
        user: { findUnique: jest.fn() },
        auditLog: { findMany: jest.fn() },
        incident: { findMany: jest.fn() },
        task: { groupBy: jest.fn() },
        risk: { findMany: jest.fn() },
        expense: { findMany: jest.fn() },
        project: { groupBy: jest.fn() }
    },
    ...overrides
});

describe('DashboardController', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getFinancialSummary', () => {
        it('should use current year if not provided', async () => {
             const req = mockRequest();
             const res = mockResponse();
             DashboardService.getFinancialSummary.mockResolvedValue({ total: 100 });

             await DashboardController.getFinancialSummary(req, res);

             expect(DashboardService.getFinancialSummary).toHaveBeenCalledWith(req.prisma, new Date().getFullYear());
             expect(res.status).toHaveBeenCalledWith(200);
        });

        it('should use provided year', async () => {
             const req = mockRequest({ query: { year: 2024 } });
             const res = mockResponse();
             DashboardService.getFinancialSummary.mockResolvedValue({ total: 100 });

             await DashboardController.getFinancialSummary(req, res);

             expect(DashboardService.getFinancialSummary).toHaveBeenCalledWith(req.prisma, 2024);
             expect(res.json).toHaveBeenCalledWith({ total: 100 });
        });

        it('should catch errors', async () => {
             const req = mockRequest();
             const res = mockResponse();
             DashboardService.getFinancialSummary.mockRejectedValue(new Error('Fail'));

             await DashboardController.getFinancialSummary(req, res);

             expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe('getSuperAdminStats', () => {
        it('should return 200 and stats', async () => {
             const req = mockRequest();
             const res = mockResponse();
             DashboardService.getSuperAdminStats.mockResolvedValue({ count: 5 });

             await DashboardController.getSuperAdminStats(req, res);
             expect(res.json).toHaveBeenCalledWith({ count: 5 });
        });

        it('should catch errors', async () => {
             const req = mockRequest();
             const res = mockResponse();
             DashboardService.getSuperAdminStats.mockRejectedValue(new Error('Fail'));
             await DashboardController.getSuperAdminStats(req, res);
             expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe('getCollaboratorStats', () => {
        it('should pass userId and return stats', async () => {
             const req = mockRequest({ user: { userId: 'tester' } });
             const res = mockResponse();
             DashboardService.getCollaboratorStats.mockResolvedValue({ tasks: 1 });

             await DashboardController.getCollaboratorStats(req, res);
             expect(DashboardService.getCollaboratorStats).toHaveBeenCalledWith(req.prisma, 'tester');
             expect(res.json).toHaveBeenCalledWith({ tasks: 1 });
        });

        it('should catch errors', async () => {
             const req = mockRequest();
             const res = mockResponse();
             DashboardService.getCollaboratorStats.mockRejectedValue(new Error('Fail'));
             await DashboardController.getCollaboratorStats(req, res);
             expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe('getManagerStats', () => {
        it('should return 404 if user not found', async () => {
             const req = mockRequest();
             const res = mockResponse();
             req.prisma.user.findUnique.mockResolvedValue(null);

             await DashboardController.getManagerStats(req, res);
             expect(res.status).toHaveBeenCalledWith(404);
        });

        it('should refresh user and yield stats', async () => {
             const req = mockRequest();
             const res = mockResponse();
             req.prisma.user.findUnique.mockResolvedValue({ id: 'u1' });
             DashboardService.getManagerStats.mockResolvedValue({ projects: 2 });

             await DashboardController.getManagerStats(req, res);
             expect(DashboardService.getManagerStats).toHaveBeenCalledWith(req.prisma, { id: 'u1' });
             expect(res.json).toHaveBeenCalledWith({ projects: 2 });
        });

        it('should catch query errors', async () => {
             const req = mockRequest();
             const res = mockResponse();
             req.prisma.user.findUnique.mockRejectedValue(new Error('fail'));
             await DashboardController.getManagerStats(req, res);
             expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe('getActivityFeed', () => {
        it('should build where clause and return 200', async () => {
             const req = mockRequest({ query: { limit: '10', module: 'finance', userId: 'u2' } });
             const res = mockResponse();
             req.prisma.auditLog.findMany.mockResolvedValue([{ id: 1 }]);

             await DashboardController.getActivityFeed(req, res);

             expect(req.prisma.auditLog.findMany).toHaveBeenCalledWith(expect.objectContaining({
                  where: { entityType: 'FINANCE', userId: 'u2' },
                  take: 10
             }));
             expect(res.json).toHaveBeenCalledWith([{ id: 1 }]);
        });

        it('should fallback take to 30 if unparseable', async () => {
             const req = mockRequest({ query: { limit: 'abc' } });
             const res = mockResponse();
             await DashboardController.getActivityFeed(req, res);
             const callArg = req.prisma.auditLog.findMany.mock.calls[0][0];
             expect(callArg.take).toBe(30);
        });

        it('should catch query errors', async () => {
             const req = mockRequest();
             const res = mockResponse();
             req.prisma.auditLog.findMany.mockRejectedValue(new Error('fail'));
             await DashboardController.getActivityFeed(req, res);
             expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe('getManagerAnalytics', () => {
        beforeEach(() => {
             accessScope.getUserAccessScope.mockResolvedValue({ accessibleCostCenterIds: ['cc1'] });
             jest.useFakeTimers().setSystemTime(new Date('2025-05-15T12:00:00.000Z'));
        });
        afterEach(() => {
             jest.useRealTimers();
        });

        it('should 404 if user not found', async () => {
             const req = mockRequest();
             const res = mockResponse();
             req.prisma.user.findUnique.mockResolvedValue(null);
             await DashboardController.getManagerAnalytics(req, res);
             expect(res.status).toHaveBeenCalledWith(404);
        });

        it('should aggregate 5 analytics sections heavily processing grouping data', async () => {
             const req = mockRequest({ user: { userId: 'u1' } });
             const res = mockResponse();

             req.prisma.user.findUnique.mockResolvedValue({ id: 'u1' });

             // incidentLogs list spanning within 30 days
             req.prisma.incident.findMany.mockResolvedValue([
                  { createdAt: new Date('2025-05-10T10:00:00.000Z'), status: 'OPEN' },
                  { createdAt: new Date('2025-05-10T11:00:00.000Z'), status: 'RESOLVED' }
             ]);

             // task grouping
             req.prisma.task.groupBy.mockResolvedValue([
                  { status: 'TODO', _count: { status: 5 } },
                  { status: 'DONE', _count: { status: 3 } }
             ]);

             // risks
             req.prisma.risk.findMany.mockResolvedValue([
                  { severity: 2 }, // low
                  { severity: 5 }, // medium
                  { severity: 8 }, // high
                  { severity: 10 }, // critical
                  { severity: 'notanumber' } // low fallback (0)
             ]);

             // expenses list
             req.prisma.expense.findMany.mockResolvedValue([
                  { date: new Date('2025-05-10'), amount: 100 },
                  { date: new Date('2025-04-10'), amount: 200 }
             ]);

             // project grouping
             req.prisma.project.groupBy.mockResolvedValue([
                  { status: 'DRAFT', _count: { status: 1 } },
                  { status: 'ONGOING', _count: { status: 4 } }
             ]);

             await DashboardController.getManagerAnalytics(req, res);

             expect(res.status).toHaveBeenCalledWith(200);

             const responseData = res.json.mock.calls[0][0];

             // 1. Incident trend
             // Should map back correctly, length 30 array
             expect(responseData.incidentTrend).toHaveLength(30);
             // May 10th should have exactly 1 created, 1 resolved. Wait...
             // Loop groups by date. 2 elements created on May 10th. Open -> created++, RESOLVED -> created++, resolved++.
             // Total created: 2. Total resolved: 1.
             const trendAt10th = responseData.incidentTrend.find(i => i.date === '2025-05-10');
             expect(trendAt10th.created).toBe(2);
             expect(trendAt10th.resolved).toBe(1);

             // 2. Task distribution
             expect(responseData.taskDistribution).toEqual({ TODO: 5, DONE: 3 });

             // 3. Risk distribution
             expect(responseData.riskDistribution).toEqual({ low: 2, medium: 1, high: 1, critical: 1 });

             // 4. Expense trend
             expect(responseData.expenseTrend).toHaveLength(6);
             const expenseAtMay = responseData.expenseTrend.find(m => m.month === '2025-05');
             expect(expenseAtMay.amount).toBe(100);
             const expenseAtApril = responseData.expenseTrend.find(m => m.month === '2025-04');
             expect(expenseAtApril.amount).toBe(200);

             // 5. Project distribution
             expect(responseData.projectDistribution).toEqual({ DRAFT: 1, ONGOING: 4 });
        });

        it('should fallback to __NO_ACCESS__ if no CCs are returned from scope', async () => {
             const req = mockRequest();
             const res = mockResponse();

             req.prisma.user.findUnique.mockResolvedValue({ id: 'u1' });
             accessScope.getUserAccessScope.mockResolvedValue({ accessibleCostCenterIds: [] });

             req.prisma.incident.findMany.mockResolvedValue([]);
             req.prisma.task.groupBy.mockResolvedValue([]);
             req.prisma.risk.findMany.mockResolvedValue([]);
             req.prisma.expense.findMany.mockResolvedValue([]);
             req.prisma.project.groupBy.mockResolvedValue([]);

             await DashboardController.getManagerAnalytics(req, res);

             // Verify task grouping
             const taskGroupBy = req.prisma.task.groupBy.mock.calls[0][0];
             expect(taskGroupBy.where.OR[0].assignee.costCenterId.in).toEqual(['__NO_ACCESS__']);
        });

        it('should catch errors gently if risk query throws', async () => {
             // 3. Risk distribution by severity uses try-catch around error, swallows.
             const req = mockRequest();
             const res = mockResponse();

             req.prisma.user.findUnique.mockResolvedValue({ id: 'u1' });
             req.prisma.incident.findMany.mockResolvedValue([]);
             req.prisma.task.groupBy.mockResolvedValue([]);
             req.prisma.expense.findMany.mockResolvedValue([]);
             req.prisma.project.groupBy.mockResolvedValue([]);
             
             req.prisma.risk.findMany.mockRejectedValue(new Error('No schema'));

             await DashboardController.getManagerAnalytics(req, res);
             
             // Doesn't 500
             expect(res.status).toHaveBeenCalledWith(200);
             expect(res.json.mock.calls[0][0].riskDistribution).toEqual({ low: 0, medium: 0, high: 0, critical: 0 });
        });

        it('should throw 500 if project query actually fails', async () => {
             const req = mockRequest();
             const res = mockResponse();
             req.prisma.user.findUnique.mockResolvedValue({ id: 'u1' });
             req.prisma.project.groupBy.mockRejectedValue(new Error('CRASH'));

             await DashboardController.getManagerAnalytics(req, res);
             expect(res.status).toHaveBeenCalledWith(500);
        });
    });
});
