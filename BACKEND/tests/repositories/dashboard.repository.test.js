const DashboardRepository = require('../../src/repositories/dashboard.repository');

describe('DashboardRepository', () => {
    let prisma;
    beforeEach(() => {
        prisma = {
            project: { count: jest.fn().mockResolvedValue(5) },
            projectTask: { count: jest.fn().mockResolvedValue(20) },
            incident: { count: jest.fn().mockResolvedValue(3) },
            changeRequest: { count: jest.fn().mockResolvedValue(8), groupBy: jest.fn().mockResolvedValue([]) },
            user: { count: jest.fn().mockResolvedValue(15) },
            asset: { count: jest.fn().mockResolvedValue(50) },
            contract: { count: jest.fn().mockResolvedValue(10) },
            expense: { aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 5000 } }) }
        };
    });

    it('countProjects', async () => {
        const result = await DashboardRepository.countProjects(prisma);
        expect(result).toBe(5);
    });

    it('countTasks', async () => {
        const result = await DashboardRepository.countTasks(prisma);
        expect(result).toBe(20);
    });

    it('countIncidents', async () => {
        const result = await DashboardRepository.countIncidents(prisma);
        expect(result).toBe(3);
    });

    it('countChangeRequests', async () => {
        const result = await DashboardRepository.countChangeRequests(prisma);
        expect(result).toBe(8);
    });

    it('countUsers', async () => {
        const result = await DashboardRepository.countUsers(prisma);
        expect(result).toBe(15);
    });

    it('countAssets', async () => {
        const result = await DashboardRepository.countAssets(prisma);
        expect(result).toBe(50);
    });

    it('countContracts', async () => {
        const result = await DashboardRepository.countContracts(prisma);
        expect(result).toBe(10);
    });

    it('sumBudgetExpenses', async () => {
        const result = await DashboardRepository.sumBudgetExpenses(prisma);
        expect(result._sum.amount).toBe(5000);
    });

    it('countProjects with where filter', async () => {
        await DashboardRepository.countProjects(prisma, { status: 'ACTIVE' });
        expect(prisma.project.count).toHaveBeenCalledWith({ where: { status: 'ACTIVE' } });
    });
});
