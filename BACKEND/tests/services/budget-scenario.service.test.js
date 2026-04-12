const BudgetScenarioService = require('../../src/services/budget-scenario.service');
const BudgetService = require('../../src/services/budget.service');
const { prisma } = require('../../src/config/database');

jest.mock('../../src/services/budget.service');
jest.mock('../../src/config/database', () => ({
    prisma: {
        budgetScenario: {
            create: jest.fn(),
            update: jest.fn(),
            findUnique: jest.fn(),
            updateMany: jest.fn(),
            findMany: jest.fn(),
            delete: jest.fn()
        }
    }
}));

describe('BudgetScenarioService', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    const mockBudget = {
        id: 1,
        items: [
            { id: 10, jan: 100, feb: 100, total: 200, type: 'OPEX' }
        ]
    };

    describe('createFromMultiplier', () => {
        it('should create scenario with multiplied values', async () => {
            BudgetService.getById.mockResolvedValue(mockBudget);

            // Expected creation
            prisma.budgetScenario.create.mockResolvedValue({ id: 1, totalOpex: 180 });
            prisma.budgetScenario.findUnique.mockResolvedValue({
                id: 1, totalOpex: 180, totalCapex: 0,
                items: [{ originalItemId: 10, total: 180 }],
                budget: { items: mockBudget.items } // For impact analysis inside create
            });
            prisma.budgetScenario.update.mockResolvedValue({ id: 1 }); // Update impact

            const result = await BudgetScenarioService.createFromMultiplier(prisma, 1, 'Cut 10%', 0.9, null, 1);

            expect(prisma.budgetScenario.create).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({
                    multiplier: 0.9,
                    totalOpex: 180 // 200 * 0.9
                })
            }));
            expect(result).toHaveProperty('impactAnalysis');
        });
    });

    describe('selectScenario', () => {
        it('should select scenario and deselect others', async () => {
            prisma.budgetScenario.findUnique.mockResolvedValue({ id: 5, budgetId: 1 });
            BudgetService.getById.mockResolvedValue({}); // Verify budget access
            prisma.budgetScenario.update.mockResolvedValue({ id: 5, isSelected: true });

            await BudgetScenarioService.selectScenario(prisma, 5, 1);

            expect(prisma.budgetScenario.updateMany).toHaveBeenCalledWith({
                where: { budgetId: 1 },
                data: { isSelected: false }
            });
            expect(prisma.budgetScenario.update).toHaveBeenCalledWith({
                where: { id: 5 },
                data: { isSelected: true }
            });
        });
    });

    describe('createCustom', () => {
        it('should create scenario from custom items', async () => {
            BudgetService.getById.mockResolvedValue(mockBudget);
            prisma.budgetScenario.create.mockResolvedValue({ id: 2, totalOpex: 300, totalCapex: 0 });
            prisma.budgetScenario.findUnique.mockResolvedValue({
                id: 2, totalOpex: 300, totalCapex: 0,
                items: [{ originalItemId: 10, total: 300 }],
                budget: { items: mockBudget.items }
            });
            prisma.budgetScenario.update.mockResolvedValue({ id: 2 });

            const customItems = [{ budgetItemId: 10, jan: 25, feb: 25, mar: 25, apr: 25, may: 25, jun: 25, jul: 25, aug: 25, sep: 25, oct: 25, nov: 25, dec: 25 }];
            const result = await BudgetScenarioService.createCustom(prisma, 1, 'Custom', customItems, 'desc', 1);
            expect(prisma.budgetScenario.create).toHaveBeenCalled();
        });
    });

    describe('compare', () => {
        it('should compare two scenarios', async () => {
            const mockScenario = {
                id: 1, budgetId: 1, name: 'S1', totalOpex: 100, totalCapex: 50,
                items: [{ originalItemId: 10, total: 100, jan: 100 }],
                budget: { items: mockBudget.items }
            };
            prisma.budgetScenario.findUnique.mockResolvedValue(mockScenario);
            BudgetService.getById.mockResolvedValue(mockBudget);

            const result = await BudgetScenarioService.compare(prisma, 1, 2, 1);
            expect(result).toBeDefined();
        });
    });

    describe('generateImpactAnalysis', () => {
        it('should generate impact analysis for a scenario', async () => {
            prisma.budgetScenario.findUnique.mockResolvedValue({
                id: 1, budgetId: 1, totalOpex: 180, totalCapex: 0,
                items: [{ originalItemId: 10, total: 180, jan: 15, feb: 15 }],
                budget: { items: mockBudget.items, totalOpex: 200, totalCapex: 0 }
            });
            BudgetService.getById.mockResolvedValue(mockBudget);
            prisma.budgetScenario.update.mockResolvedValue({ id: 1 });

            const result = await BudgetScenarioService.generateImpactAnalysis(prisma, 1, 1);
            expect(result).toBeDefined();
        });
    });

    describe('getByBudgetId', () => {
        it('should return scenarios for a budget', async () => {
            BudgetService.getById.mockResolvedValue(mockBudget);
            prisma.budgetScenario.findMany.mockResolvedValue([{ id: 1, name: 'S1' }]);

            const result = await BudgetScenarioService.getByBudgetId(prisma, 1, 1);
            expect(result).toEqual([{ id: 1, name: 'S1' }]);
        });
    });

    describe('delete', () => {
        it('should delete a scenario', async () => {
            prisma.budgetScenario.findUnique.mockResolvedValue({ id: 1, budgetId: 1, isSelected: false });
            BudgetService.getById.mockResolvedValue(mockBudget);
            prisma.budgetScenario.delete.mockResolvedValue({ id: 1 });

            await BudgetScenarioService.delete(prisma, 1, 1);
            expect(prisma.budgetScenario.delete).toHaveBeenCalledWith({ where: { id: 1 } });
        });
    });

    // ===== BATCH 7: BRANCH COVERAGE EXPANSION =====

    describe('createFromMultiplier — additional branches', () => {
        it('should throw 404 when budget not found', async () => {
            BudgetService.getById.mockResolvedValue(null);
            await expect(BudgetScenarioService.createFromMultiplier(prisma, 1, 'Cut', 0.9, null, 1))
                .rejects.toEqual(expect.objectContaining({ statusCode: 404 }));
        });

        it('should handle CAPEX items', async () => {
            const budgetWithCapex = {
                id: 1,
                items: [
                    { id: 10, jan: 100, feb: 0, mar: 0, apr: 0, may: 0, jun: 0, jul: 0, aug: 0, sep: 0, oct: 0, nov: 0, dec: 0, total: 100, type: 'CAPEX' },
                    { id: 11, jan: 50, feb: 0, mar: 0, apr: 0, may: 0, jun: 0, jul: 0, aug: 0, sep: 0, oct: 0, nov: 0, dec: 0, total: 50, type: 'OPEX' }
                ]
            };
            // First call in createFromMultiplier, second call in generateImpactAnalysis
            BudgetService.getById
                .mockResolvedValueOnce(budgetWithCapex)
                .mockResolvedValueOnce(budgetWithCapex);
            prisma.budgetScenario.create.mockResolvedValue({ id: 3, totalOpex: 45, totalCapex: 90 });
            prisma.budgetScenario.findUnique.mockResolvedValue({
                id: 3, totalOpex: 45, totalCapex: 90,
                items: [{ originalItemId: 10, total: 90 }, { originalItemId: 11, total: 45 }],
                budget: { items: budgetWithCapex.items }
            });
            prisma.budgetScenario.update.mockResolvedValue({ id: 3 });

            const result = await BudgetScenarioService.createFromMultiplier(prisma, 1, 'Mix', 0.9, null, 1);
            expect(prisma.budgetScenario.create).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({ totalCapex: 90 })
            }));
        });
    });

    describe('createCustom — additional branches', () => {
        it('should throw 404 when budget not found', async () => {
            BudgetService.getById.mockResolvedValue(null);
            await expect(BudgetScenarioService.createCustom(prisma, 1, 'Custom', [], null, 1))
                .rejects.toEqual(expect.objectContaining({ statusCode: 404 }));
        });

        it('should handle CAPEX type in custom items', async () => {
            BudgetService.getById.mockResolvedValue(mockBudget);
            prisma.budgetScenario.create.mockResolvedValue({ id: 4, totalCapex: 100 });

            await BudgetScenarioService.createCustom(prisma, 1, 'Custom', [
                { originalItemId: 10, jan: 100, type: 'CAPEX', adjustmentNotes: 'Adjusted' }
            ], 'desc', 1);
            expect(prisma.budgetScenario.create).toHaveBeenCalled();
        });
    });

    describe('compare — additional branches', () => {
        it('should throw 404 when scenario not found', async () => {
            prisma.budgetScenario.findUnique.mockResolvedValue(null);
            await expect(BudgetScenarioService.compare(prisma, 'bad1', 'bad2', 1))
                .rejects.toEqual(expect.objectContaining({ statusCode: 404 }));
        });

        it('should handle items present in only one scenario', async () => {
            const mockScenario1 = {
                id: 1, budgetId: 1, name: 'S1', totalOpex: 100, totalCapex: 0,
                items: [{ originalItemId: 10, total: 100 }],
                budget: { items: [{ id: 10, account: { name: 'IT', code: '001' }, costCenter: null, supplier: null }] }
            };
            const mockScenario2 = {
                id: 2, budgetId: 1, name: 'S2', totalOpex: 200, totalCapex: 0,
                items: [{ originalItemId: 10, total: 150 }, { originalItemId: 20, total: 50 }],
                budget: { items: [{ id: 10, account: { name: 'IT', code: '001' }, costCenter: null, supplier: null }] }
            };
            prisma.budgetScenario.findUnique
                .mockResolvedValueOnce(mockScenario1)
                .mockResolvedValueOnce(mockScenario2);
            BudgetService.getById.mockResolvedValue({
                items: [{ id: 10, account: { name: 'IT', code: '001' }, costCenter: null, supplier: null, description: 'IT Costs' }]
            });

            const result = await BudgetScenarioService.compare(prisma, 1, 2, 1);
            expect(result.items).toBeDefined();
            expect(result.difference.total).toBe(100);
        });
    });

    describe('generateImpactAnalysis — additional branches', () => {
        it('should throw 404 for non-existent scenario', async () => {
            prisma.budgetScenario.findUnique.mockResolvedValue(null);
            await expect(BudgetScenarioService.generateImpactAnalysis(prisma, 'bad', 1))
                .rejects.toEqual(expect.objectContaining({ statusCode: 404 }));
        });

        it('should generate recommendations with CC impacts', async () => {
            prisma.budgetScenario.findUnique.mockResolvedValue({
                id: 1, budgetId: 1, totalOpex: 150, totalCapex: 0,
                items: [{ originalItemId: 10, total: 150 }],
                budget: { items: [] }
            });
            BudgetService.getById.mockResolvedValue({
                items: [{ id: 10, total: 200, costCenter: { name: 'IT' } }]
            });

            const result = await BudgetScenarioService.generateImpactAnalysis(prisma, 1, 1);
            expect(result.summary.savingsOrExcess).toBe(50);
            expect(result.recommendations.some(r => r.type === 'SAVINGS')).toBe(true);
        });
    });

    describe('_generateRecommendations — additional branches', () => {
        it('should generate EXCESS recommendation', () => {
            const result = BudgetScenarioService._generateRecommendations(-500, []);
            expect(result.some(r => r.type === 'EXCESS')).toBe(true);
        });

        it('should generate HIGH_IMPACT recommendation', () => {
            const ccImpacts = [{ name: 'IT', percentChange: 30 }, { name: 'HR', percentChange: 25 }];
            const result = BudgetScenarioService._generateRecommendations(100, ccImpacts);
            expect(result.some(r => r.type === 'HIGH_IMPACT')).toBe(true);
        });

        it('should generate no recommendations for zero savings and low impact', () => {
            const result = BudgetScenarioService._generateRecommendations(0, [{ name: 'IT', percentChange: 5 }]);
            expect(result).toHaveLength(0);
        });
    });

    describe('selectScenario — additional branches', () => {
        it('should throw 404 for non-existent scenario', async () => {
            prisma.budgetScenario.findUnique.mockResolvedValue(null);
            await expect(BudgetScenarioService.selectScenario(prisma, 'bad', 1))
                .rejects.toEqual(expect.objectContaining({ statusCode: 404 }));
        });
    });

    describe('delete — additional branches', () => {
        it('should throw 404 for non-existent scenario', async () => {
            prisma.budgetScenario.findUnique.mockResolvedValue(null);
            await expect(BudgetScenarioService.delete(prisma, 'bad', 1))
                .rejects.toEqual(expect.objectContaining({ statusCode: 404 }));
        });
    });
});
