jest.mock('../../src/utils/access-scope', () => ({
    getUserAccessScope: jest.fn().mockResolvedValue({
        isAdmin: true,
        accessibleCostCenterIds: [],
        managedProjectIds: []
    }),
    getAccessibleUserIds: jest.fn().mockResolvedValue([])
}));
jest.mock('../../src/repositories/dashboard.repository');

const DashboardService = require('../../src/services/dashboard.service');
const DashboardRepository = require('../../src/repositories/dashboard.repository');

describe('DashboardService', () => {
    let prisma;
    const createModelProxy = () => new Proxy({}, {
        get: (target, prop) => {
            if (!target[prop]) {
                target[prop] = jest.fn().mockResolvedValue(
                    prop === 'count' ? 0 :
                        prop === 'aggregate' ? { _sum: { totalValue: 0, amount: 0, value: 0 } } :
                            prop === 'findUnique' ? null :
                                prop === 'findFirst' ? null :
                                    prop === 'groupBy' ? [] :
                                        prop === 'findMany' ? [] :
                                            prop === 'create' ? {} :
                                                prop === 'update' ? {} :
                                                    prop === 'delete' ? {} :
                                                        []
                );
            }
            return target[prop];
        }
    });
    beforeEach(() => {
        prisma = new Proxy({}, {
            get: (target, prop) => {
                if (!target[prop]) target[prop] = createModelProxy();
                return target[prop];
            }
        });
        // Pre-set specific values needed by tests
        prisma.department.findMany.mockResolvedValue([{ id: 'd1', costCenterId: 'cc1' }]);
        prisma.fiscalYear.findUnique.mockResolvedValue({ id: 'fy1', year: 2025 });
    });

    it('getFinancialSummary — returns summary data', async () => {
        const result = await DashboardService.getFinancialSummary(prisma, 2025);
        expect(result).toBeDefined();
    });

    it('getSuperAdminStats — returns admin stats', async () => {
        DashboardRepository.countProjects.mockResolvedValue(10);
        DashboardRepository.countTasks.mockResolvedValue(50);
        DashboardRepository.countIncidents.mockResolvedValue(5);
        DashboardRepository.countChangeRequests.mockResolvedValue(8);
        DashboardRepository.countUsers.mockResolvedValue(20);
        DashboardRepository.countAssets.mockResolvedValue(100);
        DashboardRepository.countContracts.mockResolvedValue(15);

        const result = await DashboardService.getSuperAdminStats(prisma);
        expect(result).toBeDefined();
        expect(result.projects).toBeDefined();
    });

    it('getCollaboratorStats — returns user-scoped stats', async () => {
        DashboardRepository.countTasks.mockResolvedValue(3);
        DashboardRepository.countIncidents.mockResolvedValue(0);
        DashboardRepository.countChangeRequests.mockResolvedValue(0);
        const result = await DashboardService.getCollaboratorStats(prisma, 'u1');
        expect(result).toBeDefined();
    });

    it('getManagerStats — returns manager-scoped stats', async () => {
        DashboardRepository.countProjects.mockResolvedValue(5);
        DashboardRepository.countTasks.mockResolvedValue(20);
        DashboardRepository.countIncidents.mockResolvedValue(2);
        DashboardRepository.countChangeRequests.mockResolvedValue(3);
        DashboardRepository.countUsers.mockResolvedValue(10);
        DashboardRepository.countAssets.mockResolvedValue(50);
        DashboardRepository.countContracts.mockResolvedValue(8);
        const user = { userId: 'u1', role: 'MANAGER' };
        const result = await DashboardService.getManagerStats(prisma, user);
        expect(result).toBeDefined();
    });

    // ===== BATCH 6: BRANCH COVERAGE EXPANSION =====

    it('getFinancialSummary — handles CAPEX expense type', async () => {
        prisma.budget.findMany.mockResolvedValue([{ totalOpex: 1000, totalCapex: 2000 }]);
        prisma.expense.groupBy.mockResolvedValue([
            { type: 'CAPEX', _sum: { amount: 500 } },
            { type: 'OPEX', _sum: { amount: 300 } }
        ]);
        prisma.costCenter.findUnique.mockResolvedValue({ name: 'IT Department' });

        const result = await DashboardService.getFinancialSummary(prisma, 2025);
        expect(result.capex.realized).toBe(500);
        expect(result.opex.realized).toBe(300);
        expect(result.capex.percentUsed).toBeGreaterThan(0);
    });

    it('getFinancialSummary — percentUsed=0 when budget is 0', async () => {
        prisma.budget.findMany.mockResolvedValue([]);
        prisma.expense.groupBy.mockResolvedValue([]);

        const result = await DashboardService.getFinancialSummary(prisma, 2025);
        expect(result.opex.percentUsed).toBe(0);
        expect(result.capex.percentUsed).toBe(0);
    });

    it('getSuperAdminStats — handles budget aggregation and risk count', async () => {
        DashboardRepository.countProjects.mockResolvedValue(0);
        DashboardRepository.countTasks.mockResolvedValue(0);
        DashboardRepository.countIncidents.mockResolvedValue(0);
        DashboardRepository.countChangeRequests.mockResolvedValue(0);
        DashboardRepository.countUsers.mockResolvedValue(0);
        DashboardRepository.countAssets.mockResolvedValue(0);
        DashboardRepository.countContracts.mockResolvedValue(0);
        DashboardRepository.findRecentProjects.mockResolvedValue([]);
        DashboardRepository.findRecentIncidents.mockResolvedValue([]);
        DashboardRepository.sumBudgetItems.mockResolvedValue({ _sum: { jan: 100, feb: 200 } });
        DashboardRepository.sumBudgetExpenses.mockResolvedValue({ _sum: { amount: 50 } });
        prisma.risk.count.mockResolvedValue(5);

        const result = await DashboardService.getSuperAdminStats(prisma);
        expect(result.financial.budget).toBeGreaterThan(0);
        expect(result.financial.expenses).toBe(50);
    });

    it('getSuperAdminStats — handles errors in optional counts', async () => {
        DashboardRepository.countProjects.mockResolvedValue(0);
        DashboardRepository.countTasks.mockResolvedValue(0);
        DashboardRepository.countIncidents.mockResolvedValue(0);
        DashboardRepository.countChangeRequests.mockResolvedValue(0);
        DashboardRepository.countUsers.mockResolvedValue(0);
        DashboardRepository.countAssets.mockResolvedValue(0);
        DashboardRepository.countContracts.mockResolvedValue(0);
        DashboardRepository.findRecentProjects.mockResolvedValue([]);
        DashboardRepository.findRecentIncidents.mockResolvedValue([]);
        // These throw to test try/catch branches
        prisma.risk.count.mockRejectedValue(new Error('no risk table'));
        prisma.department.count.mockRejectedValue(new Error('no dept'));
        DashboardRepository.sumBudgetItems.mockRejectedValue(new Error('no budget'));

        const result = await DashboardService.getSuperAdminStats(prisma);
        expect(result.risks.total).toBe(0); // Default from catch
        expect(result.departments).toBe(0); // Default from catch
    });

    // ===== BATCH 8: DEEPER BRANCH COVERAGE =====

    describe('getCollaboratorStats — additional branches', () => {
        it('should calculate progress for projects with tasks', async () => {
            prisma.project.count.mockResolvedValue(2);
            prisma.task.count.mockResolvedValue(3);
            prisma.changeRequest.count.mockResolvedValue(1);
            prisma.task.findMany.mockResolvedValue([]);
            prisma.project.findMany.mockResolvedValue([
                { id: 'p1', name: 'P1', _count: { tasks: 10 }, tasks: [{ id: 't1' }, { id: 't2' }, { id: 't3' }] },
                { id: 'p2', name: 'P2', _count: { tasks: 0 }, tasks: [] }
            ]);
            prisma.changeRequest.findMany.mockResolvedValue([]);

            const result = await DashboardService.getCollaboratorStats(prisma, 'u1');
            expect(result.myProjects[0].progress).toBe(30); // 3/10 * 100
            expect(result.myProjects[1].progress).toBe(0); // 0 tasks = 0%
        });
    });

    describe('getManagerStats — additional branches', () => {
        const { getUserAccessScope, getAccessibleUserIds } = require('../../src/utils/access-scope');

        beforeEach(() => {
            getUserAccessScope.mockResolvedValue({
                isAdmin: false,
                accessibleCostCenterIds: ['cc1']
            });
            getAccessibleUserIds.mockResolvedValue(['u1']);
        });

        it('should map activity types from module names', async () => {
            prisma.project.count.mockResolvedValue(0);
            prisma.task.count.mockResolvedValue(0);
            prisma.changeRequest.count.mockResolvedValue(0);
            prisma.asset.count.mockResolvedValue(0);
            prisma.contract.count.mockResolvedValue(0);
            prisma.fiscalYear.findUnique.mockResolvedValue(null); // No fiscal year
            prisma.expense.aggregate.mockResolvedValue({ _sum: { amount: 0 } });
            prisma.changeRequest.findMany.mockResolvedValue([]);
            prisma.expense.findMany.mockResolvedValue([]);
            prisma.meetingMinute.findMany.mockResolvedValue([]);
            prisma.contract.findMany.mockResolvedValue([]);
            prisma.auditLog.findMany.mockResolvedValue([
                { module: 'PROJETOS', action: 'criou', entityId: 'e1', createdAt: new Date(), user: { name: 'Admin' }, newData: { code: 'PRJ-001' }, oldData: null },
                { module: 'GMUD', action: 'aprovou', entityId: 'e2', createdAt: new Date(), user: { name: 'Admin' }, newData: null, oldData: { title: 'Change' } },
                { module: 'CONTRATOS', action: 'criou', entityId: 'e3', createdAt: new Date(), user: { name: 'User' }, newData: { number: 'CT-001' }, oldData: null },
                { module: 'TAREFAS', action: 'fechou', entityId: 'e4', createdAt: new Date(), user: null, newData: null, oldData: null },
                { module: 'DESPESAS', action: 'criou', entityId: 'e5', createdAt: new Date(), user: { name: 'User' }, newData: { name: 'Cloud' }, oldData: null },
                { module: 'APROVACAO', action: 'aprovou', entityId: 'e6', createdAt: new Date(), user: { name: 'Approver' }, newData: null, oldData: null },
                { module: 'LOGIN', action: 'login', entityId: 'e7', createdAt: new Date(), user: { name: 'User' }, newData: null, oldData: null },
            ]);

            const result = await DashboardService.getManagerStats(prisma, { id: 'u1' });
            expect(result.kpis.finance.budget).toBe(0); // No fiscal year
            const types = result.activities.map(a => a.type);
            expect(types).toContain('PROJECT');
            expect(types).toContain('GMUD');
            expect(types).toContain('CONTRACT');
            expect(types).toContain('TASK');
            expect(types).toContain('EXPENSE');
            expect(types).toContain('APPROVAL');
            expect(types).toContain('LOGIN');
        });

        it('should handle fiscal year with budget calculation', async () => {
            prisma.project.count.mockResolvedValue(1);
            prisma.task.count.mockResolvedValue(2);
            prisma.changeRequest.count.mockResolvedValue(0);
            prisma.asset.count.mockResolvedValue(5);
            prisma.contract.count.mockResolvedValue(3);
            prisma.fiscalYear.findUnique.mockResolvedValue({ id: 'fy-1' });
            prisma.budgetItem.aggregate.mockResolvedValue({ _sum: { total: 50000 } });
            prisma.expense.aggregate.mockResolvedValue({ _sum: { amount: 30000 } });
            prisma.changeRequest.findMany.mockResolvedValue([]);
            prisma.expense.findMany.mockResolvedValue([]);
            prisma.meetingMinute.findMany.mockResolvedValue([]);
            prisma.contract.findMany.mockResolvedValue([]);
            prisma.auditLog.findMany.mockResolvedValue([]);

            const result = await DashboardService.getManagerStats(prisma, { id: 'u1' });
            expect(result.kpis.finance.budget).toBe(50000);
            expect(result.kpis.finance.spent).toBe(30000);
        });

        it('should handle accessibleCostCenterIds empty (no-access fallback)', async () => {
            getUserAccessScope.mockResolvedValue({
                isAdmin: false, accessibleCostCenterIds: []
            });
            prisma.project.count.mockResolvedValue(0);
            prisma.task.count.mockResolvedValue(0);
            prisma.changeRequest.count.mockResolvedValue(0);
            prisma.asset.count.mockResolvedValue(0);
            prisma.contract.count.mockResolvedValue(0);
            prisma.fiscalYear.findUnique.mockResolvedValue(null);
            prisma.expense.aggregate.mockResolvedValue({ _sum: { amount: 0 } });
            prisma.changeRequest.findMany.mockResolvedValue([]);
            prisma.expense.findMany.mockResolvedValue([]);
            prisma.meetingMinute.findMany.mockResolvedValue([]);
            prisma.contract.findMany.mockResolvedValue([]);
            prisma.auditLog.findMany.mockResolvedValue([]);

            const result = await DashboardService.getManagerStats(prisma, { id: 'u1' });
            expect(result.kpis.projects).toBe(0);
        });
    });
});
