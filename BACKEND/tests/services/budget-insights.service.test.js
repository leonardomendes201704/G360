const BudgetInsightsService = require('../../src/services/budget-insights.service');
const BudgetService = require('../../src/services/budget.service');

jest.mock('../../src/services/budget.service');

const generatePrismaMock = () => ({
    fiscalYear: { findFirst: jest.fn() },
    budget: { findFirst: jest.fn() }
});

const generateBudget = (id, year, items = [], opex = 0, capex = 0) => ({
    id, status: 'APPROVED',
    fiscalYear: { id: `fy-${year}`, year },
    totalOpex: opex, totalCapex: capex,
    items
});

describe('BudgetInsightsService', () => {
    let mockPrisma;

    beforeEach(() => {
        jest.clearAllMocks();
        mockPrisma = generatePrismaMock();
    });

    describe('analyze', () => {
         it('should throw 404 mapping gracefully if budget misses natively', async () => {
              BudgetService.getById.mockResolvedValue(null);
              await expect(BudgetInsightsService.analyze(mockPrisma, 'b1', 'u1'))
                  .rejects.toEqual({ statusCode: 404, message: 'Orcamento nao encontrado.' });
         });

         it('should process full insights executing previous loops perfectly matching analytical structures', async () => {
              const currentItems = [
                  { accountId: 'a1', costCenterId: 'c1', total: 100, account: { name: 'A' }, costCenter: { name: 'C1' }, priority: 'ESSENCIAL', justification: 'ok', isNewExpense: true, previousYearValue: 50, variancePercent: 100 },
                  { accountId: 'a2', costCenterId: 'c2', total: 200, account: { name: 'B' }, costCenter: { name: 'C2' }, priority: 'DESEJAVEL', justification: null, isNewExpense: false, previousYearValue: 0 }
              ];
              const prevItems = [
                  { accountId: 'a1', costCenterId: 'c1', total: 50, account: { name: 'A' }, costCenter: { name: 'C1' } },
                  { accountId: 'a2', costCenterId: 'c2', total: 150, account: { name: 'B' } } // different CC to test filtering
              ];

              const currentBudget = generateBudget('b1', 2025, currentItems, 100, 200);
              const previousBudget = generateBudget('b0', 2024, prevItems, 50, 150);

              BudgetService.getById.mockResolvedValue(currentBudget);

              mockPrisma.fiscalYear.findFirst.mockResolvedValue({ id: 'fy-2024', year: 2024 });
              mockPrisma.budget.findFirst.mockResolvedValue(previousBudget);

              const result = await BudgetInsightsService.analyze(mockPrisma, 'b1', 'u1');

              expect(result.summary.total).toBe(300);
              expect(result.summary.opexPercent).toBeCloseTo(33.33);
              expect(result.summary.capexPercent).toBeCloseTo(66.67);
              expect(result.summary.costCentersCount).toBe(2);

              expect(result.yearOverYear.available).toBe(true);
              expect(result.yearOverYear.variance).toBe(100); // 300 - 200
              expect(result.yearOverYear.topIncreases.length).toBeGreaterThanOrEqual(1);

              expect(result.distribution.byPriority.find(p => p.name === 'DESEJAVEL').percent).toBeCloseTo(66.67); // 200/300

              expect(result.obzAnalysis.totalItems).toBe(2);
              expect(result.obzAnalysis.justificationRate).toBe(50);
              expect(result.obzAnalysis.obzCompliance).toBe(75); // (1 just + 2 prio) / 4 = 3/4 = 75%

              expect(result.risks.find(r => r.type === 'CONCENTRATION')).toBeTruthy();
              expect(result.risks.find(r => r.type === 'OBZ_INCOMPLETE')).toBeTruthy();
              expect(result.risks.find(r => r.type === 'HIGH_VARIANCE')).toBeTruthy();

              // Recommendations map
              expect(result.recommendations.some(r => r.category === 'GOVERNANCE')).toBe(true);
              expect(result.recommendations.some(r => r.category === 'OPTIMIZATION')).toBe(true);
              expect(result.recommendations.some(r => r.category === 'VARIANCE')).toBe(true);
         });
         
         it('should execute full breakdown smoothly passing 0 variables when totals are perfectly empty natively', async () => {
              const currentBudget = generateBudget('b1', 2025, [], 0, 0);
              const previousBudget = generateBudget('b0', 2024, [
                 { accountId: 'a1', total: 0 } // coverage top branch logic previousBudget items empty zero loop
              ], 0, 0);

              BudgetService.getById.mockResolvedValue(currentBudget);

              mockPrisma.fiscalYear.findFirst.mockResolvedValue({ id: 'fy-2024', year: 2024 });
              mockPrisma.budget.findFirst.mockResolvedValue(previousBudget);

              const result = await BudgetInsightsService.analyze(mockPrisma, 'b1', 'u1');

              expect(result.summary.opexPercent).toBe(0);
              expect(result.summary.capexPercent).toBe(0);
              expect(result.yearOverYear.variancePercent).toBe(0);
              expect(result.obzAnalysis.justificationRate).toBe(0);
              expect(result.obzAnalysis.priorityRate).toBe(0);
              expect(result.obzAnalysis.obzCompliance).toBe(0);
         });

         it('should seamlessly process missing previous year context gracefully emitting bypassed comparisons', async () => {
              const currentBudget = generateBudget('b1', 2025, [{ accountId: 'a', total: 100 }], 50, 50);

              BudgetService.getById.mockResolvedValue(currentBudget);
              mockPrisma.fiscalYear.findFirst.mockResolvedValue(null);

              const result = await BudgetInsightsService.analyze(mockPrisma, 'b1', 'u1');

              expect(result.yearOverYear.available).toBe(false);
              expect(result.recommendations.some(r => r.category === 'VARIANCE')).toBe(false); // Should not contain YoY var recommendation
         });
    });

    describe('_getPreviousYearBudget specific filters', () => {
         it('should skip parsing cleanly if previous year exists but budget record is missing natively', async () => {
              mockPrisma.fiscalYear.findFirst.mockResolvedValue({ id: 'f' });
              mockPrisma.budget.findFirst.mockResolvedValue(null);

              const res = await BudgetInsightsService._getPreviousYearBudget(mockPrisma, 2025, ['c1']);
              expect(res).toBeNull();
         });

         it('should skip cost center matching array implicitly if passing empty filter array cleanly', async () => {
              const budget = generateBudget('b', 2024, [{ costCenterId: 'c1' }]);
              mockPrisma.fiscalYear.findFirst.mockResolvedValue({ id: 'f' });
              mockPrisma.budget.findFirst.mockResolvedValue(budget);

              const res = await BudgetInsightsService._getPreviousYearBudget(mockPrisma, 2025, []);
              expect(res.items).toHaveLength(1);
         });
    });
    
    describe('_compareWithPreviousYear specifics', () => {
         it('should process decreases effectively filtering top impacts negatively', async () => {
              // Current drops heavily triggering < 0 variances natively
              const currentBudget = generateBudget('b1', 2025, [{ accountId: 'a1', total: 50 }], 50, 0);
              const previousBudget = generateBudget('b0', 2024, [{ accountId: 'a1', total: 200 }], 200, 0);
              
              const res = BudgetInsightsService._compareWithPreviousYear(currentBudget, previousBudget);
              expect(res.variance).toBe(-150);
              expect(res.variancePercent).toBe(-75);
              expect(res.topDecreases).toHaveLength(1);
              expect(res.topDecreases[0].variancePercent).toBe(-75);
         });
         
         it('should map current > 0 variance 100% when previous is explicitly 0 natively', async () => {
              const currentBudget = generateBudget('b1', 2025, [{ accountId: 'a1', total: 50 }], 50, 0);
              const previousBudget = generateBudget('b0', 2024, [{ accountId: 'a1', total: 0 }], 0, 0);
              
              const res = BudgetInsightsService._compareWithPreviousYear(currentBudget, previousBudget);
              expect(res.variancePercent).toBe(0); // overall is 0 since prev is 0
              expect(res.topIncreases[0].variancePercent).toBe(100); // the item variance mapped to 100 since previous item=0
         });
    });

    describe('_analyzeDistribution empty cases', () => {
         it('should return 0 percent consistently mapping blank priority totals safely', async () => {
              const budget = generateBudget('b', 2025, [{ total: 0 }]);
              const distribution = BudgetInsightsService._analyzeDistribution(budget);
              expect(distribution.byPriority[0].percent).toBe(0);
              expect(distribution.byCostCenter[0].percent).toBe(0);
         });
    });

    describe('_identifyRisks severe paths', () => {
         it('should trigger severe HIGH concentration > 50%', async () => {
              const budget = generateBudget('b', 2025, [{ costCenterId: 'c1', total: 80 }, { costCenterId: 'c2', total: 20 }], 100, 0);
              const risks = BudgetInsightsService._identifyRisks(budget);
              const concentration = risks.find(r => r.type === 'CONCENTRATION');
              expect(concentration.severity).toBe('HIGH');
         });
    });
    
    describe('_generateRecommendations classification paths', () => {
         it('should flag classification recommendation actively highlighting items missing priority elements', async () => {
              const budget = generateBudget('b', 2025, [{ justification: 'x' }], 100, 0); // has justification, NO priority
              const recs = BudgetInsightsService._generateRecommendations(budget, null);
              const classif = recs.find(r => r.category === 'CLASSIFICATION');
              expect(classif).toBeTruthy();
         });
    });
});
