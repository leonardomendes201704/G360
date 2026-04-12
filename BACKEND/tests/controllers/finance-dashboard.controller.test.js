const FinanceDashboardController = require('../../src/controllers/finance-dashboard.controller');
const FinanceDashboardService = require('../../src/services/finance-dashboard.service');
jest.mock('../../src/services/finance-dashboard.service');

describe('FinanceDashboardController', () => {
    let req, res;
    beforeEach(() => {
        req = { query: { year: '2025' }, user: { userId: 'u1' }, prisma: {} };
        res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
    });

    const methods = [
        ['getBudgetOverview', 'getBudgetOverview'],
        ['getMonthlyEvolution', 'getMonthlyEvolution'],
        ['getCostCenterPerformance', 'getCostCenterPerformance'],
        ['getAccountPerformance', 'getAccountPerformance'],
        ['getAdvancedStats', 'getAdvancedStats'],
        ['getInsights', 'getInsights'],
        ['getRecentActivities', 'getRecentActivities'],
        ['getDREDetails', 'getDREDetails']
    ];

    methods.forEach(([controllerMethod, serviceMethod]) => {
        it(`${controllerMethod} — returns data`, async () => {
            FinanceDashboardService[serviceMethod].mockResolvedValue({ data: [] });
            await FinanceDashboardController[controllerMethod](req, res);
            expect(res.json).toHaveBeenCalledWith({ data: [] });
        });
    });
});
