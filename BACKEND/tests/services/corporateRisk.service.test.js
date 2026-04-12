const CorporateRiskService = require('../../src/services/corporate-risk.service');
const { PrismaClient } = require('@prisma/client');

jest.mock('@prisma/client', () => {
    const mockPrisma = {
        corporateRisk: {
            create: jest.fn(),
            findMany: jest.fn(),
            findUnique: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            count: jest.fn(),
            groupBy: jest.fn()
        }
    };
    return { PrismaClient: jest.fn(() => mockPrisma) };
});

// Helper to access the mock instance for assertions
const prisma = new PrismaClient();

describe('CorporateRiskService', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('create', () => {
        it('should calculate severity and create risk', async () => {
            prisma.corporateRisk.count.mockResolvedValue(10);
            prisma.corporateRisk.create.mockResolvedValue({ id: 11, code: 'RISK-2024-011', severity: 20 });

            const data = { probability: 'ALTA', impact: 'CRITICO', description: 'Test' };
            // ALTA(4) * CRITICO(5) = 20

            const result = await CorporateRiskService.create(prisma, data, 1);

            expect(result.severity).toBe(20);
            expect(prisma.corporateRisk.create).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({
                    code: expect.stringMatching(/RISK-\d{4}-011/),
                    severity: 20,
                    status: 'IDENTIFICADO'
                })
            }));
        });
    });

    describe('update', () => {
        it('should recalculate severity if probability changes', async () => {
            prisma.corporateRisk.findUnique.mockResolvedValue({ id: 1, probability: 'BAIXA', impact: 'BAIXO' });
            prisma.corporateRisk.update.mockResolvedValue({ id: 1, severity: 10 });

            await CorporateRiskService.update(prisma, 1, { probability: 'MUITO_ALTA' });
            // MUITO_ALTA(5) * BAIXA(2) = 10

            expect(prisma.corporateRisk.update).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({ severity: 10 })
            }));
        });
    });

    describe('getHeatmapMetrics', () => {
        it('should group by probability and impact', async () => {
            const mockDist = [{ probability: 'ALTA', impact: 'ALTA', _count: { id: 5 } }];
            prisma.corporateRisk.groupBy.mockResolvedValue(mockDist);

            const result = await CorporateRiskService.getHeatmapMetrics(prisma);
            expect(result).toEqual(mockDist);
        });
    });
});
