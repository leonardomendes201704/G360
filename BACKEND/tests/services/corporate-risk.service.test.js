jest.mock('../../src/repositories/corporate-risk.repository');
jest.mock('../../src/utils/access-scope', () => ({
    getUserAccessScope: jest.fn().mockResolvedValue({ isAdmin: true }),
    getAccessibleUserIds: jest.fn().mockResolvedValue(null)
}));

const corporateRiskService = require('../../src/services/corporate-risk.service');

describe('CorporateRiskService', () => {
    let prisma;

    beforeEach(() => {
        jest.clearAllMocks();
        prisma = {
            corporateRisk: {
                count: jest.fn().mockResolvedValue(5),
                create: jest.fn().mockResolvedValue({ id: 'r1', code: 'RISK-2025-006' }),
                findMany: jest.fn().mockResolvedValue([{ id: 'r1' }]),
                findUnique: jest.fn().mockResolvedValue({
                    id: 'r1', ownerId: 'u1', probability: 'ALTA', impact: 'ALTO'
                }),
                update: jest.fn().mockResolvedValue({ id: 'r1' }),
                delete: jest.fn().mockResolvedValue({ id: 'r1' }),
                groupBy: jest.fn().mockResolvedValue([
                    { probability: 'ALTA', impact: 'ALTO', _count: { id: 3 } }
                ])
            },
            user: {
                findUnique: jest.fn().mockResolvedValue({ id: 'u1', roles: [{ name: 'Admin' }] }),
                findMany: jest.fn().mockResolvedValue([])
            },
            costCenter: {
                findMany: jest.fn().mockResolvedValue([])
            }
        };
    });

    describe('create', () => {
        it('should create risk with calculated severity and auto code', async () => {
            const data = {
                title: 'Test Risk',
                probability: 'ALTA',
                impact: 'ALTO',
                departmentId: '',
                assetId: '',
                supplierId: ''
            };

            const result = await corporateRiskService.create(prisma, data, 'u1');
            expect(prisma.corporateRisk.count).toHaveBeenCalled();
            expect(prisma.corporateRisk.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        severity: 16, // 4 * 4
                        status: 'IDENTIFICADO',
                        departmentId: null, // sanitized empty string
                        assetId: null,
                        supplierId: null
                    })
                })
            );
        });
    });

    describe('findAll', () => {
        it('should return all risks for admin', async () => {
            const result = await corporateRiskService.findAll(prisma, {}, 'u1');
            expect(prisma.corporateRisk.findMany).toHaveBeenCalled();
        });

        it('should apply filters', async () => {
            await corporateRiskService.findAll(prisma, {
                status: 'IDENTIFICADO',
                category: 'OPERACIONAL',
                minSeverity: '10',
                departmentId: 'd1'
            }, 'u1');
            expect(prisma.corporateRisk.findMany).toHaveBeenCalled();
        });
    });

    describe('findById', () => {
        it('should return risk by id', async () => {
            const result = await corporateRiskService.findById(prisma, 'r1');
            expect(result.id).toBe('r1');
        });

        it('should return null if not found', async () => {
            prisma.corporateRisk.findUnique.mockResolvedValue(null);
            const result = await corporateRiskService.findById(prisma, 'invalid');
            expect(result).toBeNull();
        });
    });

    describe('delete', () => {
        it('should delete risk', async () => {
            const result = await corporateRiskService.delete(prisma, 'r1');
            expect(prisma.corporateRisk.delete).toHaveBeenCalledWith({
                where: { id: 'r1' }
            });
        });
    });

    describe('getHeatmapMetrics', () => {
        it('should return risk distribution for admin', async () => {
            const result = await corporateRiskService.getHeatmapMetrics(prisma, 'u1');
            expect(prisma.corporateRisk.groupBy).toHaveBeenCalled();
            expect(result).toEqual(expect.arrayContaining([
                expect.objectContaining({ probability: 'ALTA' })
            ]));
        });

        it('should return all risks when no userId', async () => {
            const result = await corporateRiskService.getHeatmapMetrics(prisma);
            expect(prisma.corporateRisk.groupBy).toHaveBeenCalledWith(
                expect.objectContaining({ where: {} })
            );
        });
    });
});
