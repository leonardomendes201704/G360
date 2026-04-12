const ChangeMetricsRepository = require('../../src/repositories/change-metrics.repository');

describe('ChangeMetricsRepository', () => {
    let prisma;
    beforeEach(() => {
        prisma = {
            changeRequest: {
                groupBy: jest.fn().mockResolvedValue([{ status: 'APPROVED', _count: 5 }]),
                findMany: jest.fn().mockResolvedValue([])
            }
        };
    });

    it('countByStatus', async () => {
        const result = await ChangeMetricsRepository.countByStatus(prisma);
        expect(prisma.changeRequest.groupBy).toHaveBeenCalledWith(expect.objectContaining({ by: ['status'] }));
        expect(result).toHaveLength(1);
    });

    it('countByType', async () => {
        await ChangeMetricsRepository.countByType(prisma);
        expect(prisma.changeRequest.groupBy).toHaveBeenCalledWith(expect.objectContaining({ by: ['type'] }));
    });

    it('countByRiskLevel', async () => {
        await ChangeMetricsRepository.countByRiskLevel(prisma);
        expect(prisma.changeRequest.groupBy).toHaveBeenCalledWith(expect.objectContaining({ by: ['riskLevel'] }));
    });

    it('findCompleted', async () => {
        const result = await ChangeMetricsRepository.findCompleted(prisma);
        expect(prisma.changeRequest.findMany).toHaveBeenCalledWith(expect.objectContaining({
            where: expect.objectContaining({ status: 'COMPLETED' })
        }));
    });

    it('findByMonth', async () => {
        const start = new Date('2025-01-01');
        const end = new Date('2025-01-31');
        await ChangeMetricsRepository.findByMonth(prisma, start, end);
        expect(prisma.changeRequest.findMany).toHaveBeenCalled();
    });
});
