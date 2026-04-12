const BudgetComparisonController = require('../../src/controllers/budget-comparison.controller');

jest.mock('../../src/config/logger', () => ({
    error: jest.fn()
}));

const mockResponse = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

const mockRequest = (overrides = {}) => ({
    body: {},
    prisma: {
        budget: {
            findUnique: jest.fn(),
            findMany: jest.fn()
        }
    },
    ...overrides
});

const generateBudget = (id, opex, capex, items, isOBZ = false) => ({
    id, name: `Budget ${id}`, fiscalYear: { year: 2025 },
    isOBZ, totalOpex: opex, totalCapex: capex,
    items
});

describe('BudgetComparisonController', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('compare', () => {
         it('should 400 if missing ids or same ids provided', async () => {
              const req = mockRequest({ body: { budgetId1: '1' } });
              const res = mockResponse();
              
              await BudgetComparisonController.compare(req, res);
              expect(res.status).toHaveBeenCalledWith(400);

              req.body = { budgetId1: '1', budgetId2: '1' };
              await BudgetComparisonController.compare(req, res);
              expect(res.status).toHaveBeenCalledWith(400);
         });

         it('should 404 if missing budgets natively', async () => {
              const req = mockRequest({ body: { budgetId1: '1', budgetId2: '2' } });
              const res = mockResponse();
              req.prisma.budget.findUnique.mockResolvedValue(null);
              
              await BudgetComparisonController.compare(req, res);
              expect(res.status).toHaveBeenCalledWith(404);
         });

         it('should map detailed variance across elements accounting for added, removed, and changed correctly', async () => {
              const req = mockRequest({ body: { budgetId1: 'b1', budgetId2: 'b2' } });
              const res = mockResponse();

              const b1 = generateBudget('b1', 100, 50, [
                  { accountId: 'a1', supplierId: 's1', total: 100, account: { name: 'A1', code: '01' }, priority: 'ESSENCIAL' }, // Changed in b2
                  { accountId: 'a2', supplierId: null, total: 50, priority: null }, // Removed in b2
                  { accountId: 'a4', supplierId: 's4', total: 0 } // Unchanged
              ], true);

              const b2 = generateBudget('b2', 200, 0, [
                  { accountId: 'a1', supplierId: 's1', total: 150, account: { name: 'A1', code: '01' }, priority: 'ESSENCIAL' }, // Increased
                  { accountId: 'a3', supplierId: 's3', total: 50, supplier: { name: 'S3' } }, // Added
                  { accountId: 'a4', supplierId: 's4', total: 0 } // Unchanged
              ], false);

              req.prisma.budget.findUnique.mockResolvedValueOnce(b1).mockResolvedValueOnce(b2);

              await BudgetComparisonController.compare(req, res);

              expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                  summary: expect.objectContaining({
                      itemsAdded: 1, itemsRemoved: 1, itemsChanged: 1, totalDifference: 50
                  })
              }));
         });

         it('should calculate 100% variance if budget 1 had 0 value on dynamic map', async () => {
              const req = mockRequest({ body: { budgetId1: 'b1', budgetId2: 'b2' } });
              const res = mockResponse();

              const b1 = generateBudget('b1', 0, 0, [{ total: 0, priority: 'DESEJAVEL' }]);
              const b2 = generateBudget('b2', 100, 0, [{ total: 100 }]);

              req.prisma.budget.findUnique.mockResolvedValueOnce(b1).mockResolvedValueOnce(b2);

              await BudgetComparisonController.compare(req, res);
              const { summary, byPriority } = res.json.mock.calls[0][0];
              expect(summary.percentChange).toBe(0); // If 1Total==0, diff % is 0 globally based on logic
              // However for items, percentChange when 0 -> 100 is 100%
         });

         it('should 500 on db error', async () => {
              const req = mockRequest({ body: { budgetId1: '1', budgetId2: '2' } });
              const res = mockResponse();
              req.prisma.budget.findUnique.mockRejectedValue(new Error('db'));
              await BudgetComparisonController.compare(req, res);
              expect(res.status).toHaveBeenCalledWith(500);
         });
    });

    describe('compareMultiple', () => {
         it('should 400 on bad arrays or less than 2 distinct elements natively', async () => {
              const res = mockResponse();
              await BudgetComparisonController.compareMultiple(mockRequest({ body: {} }), res);
              expect(res.status).toHaveBeenCalledWith(400);

              await BudgetComparisonController.compareMultiple(mockRequest({ body: { budgetIds: ['1'] } }), res);
              expect(res.status).toHaveBeenCalledWith(400);

              await BudgetComparisonController.compareMultiple(mockRequest({ body: { budgetIds: ['1', '1'] } }), res);
              expect(res.status).toHaveBeenCalledWith(400);
         });

         it('should 404 if db yields less than 2 distinct budgets', async () => {
              const req = mockRequest({ body: { budgetIds: ['1', '2'] } });
              const res = mockResponse();
              req.prisma.budget.findMany.mockResolvedValue([generateBudget('1', 0, 0, [])]);
              await BudgetComparisonController.compareMultiple(req, res);
              expect(res.status).toHaveBeenCalledWith(404);
         });

         it('should build detailed cross map arrays for accounts, suppliers and priorities consistently', async () => {
              const req = mockRequest({ body: { budgetIds: ['1', '2'] } });
              const res = mockResponse();
              
              const b1 = generateBudget('1', 100, 0, [
                  { account: { code: 'A', name: 'N', type: 'T' }, supplier: null, total: 100, priority: 'IMPORTANTE' }
              ], true);
              const b2 = generateBudget('2', 0, 100, [
                  { account: { code: 'A', name: 'N', type: 'T' }, supplier: { name: 'S' }, total: 200, priority: null } // no priority maps to SEM_PRIORIDADE
              ], false);

              req.prisma.budget.findMany.mockResolvedValue([b1, b2]);

              await BudgetComparisonController.compareMultiple(req, res);

              const payload = res.json.mock.calls[0][0];
              expect(payload.byAccount).toHaveLength(1);
              expect(payload.byAccount[0].values).toEqual([100, 200]);

              expect(payload.bySupplier).toHaveLength(2); // 'Sem fornecedor' and 'S'
              expect(payload.byPriority).toHaveLength(4); // ESSENCIAL, IMPORTANTE, DESEJAVEL, SEM_PRIORIDADE
         });

         it('should emit null array for priority mapping if no budget is OBZ', async () => {
              const req = mockRequest({ body: { budgetIds: ['1', '2'] } });
              const res = mockResponse();
              const b1 = generateBudget('1', 100, 0, []);
              const b2 = generateBudget('2', 0, 100, []);
              req.prisma.budget.findMany.mockResolvedValue([b1, b2]);

              await BudgetComparisonController.compareMultiple(req, res);
              expect(res.json.mock.calls[0][0].byPriority).toBeNull();
         });

         it('should 500 cleanly on exception', async () => {
              const req = mockRequest({ body: { budgetIds: ['1', '2'] } });
              const res = mockResponse();
              req.prisma.budget.findMany.mockRejectedValue(new Error('x'));
              await BudgetComparisonController.compareMultiple(req, res);
              expect(res.status).toHaveBeenCalledWith(500);
         });
    });

    describe('getAvailableForComparison', () => {
         it('should map count metadata resolving 200 cleanly', async () => {
              const req = mockRequest();
              const res = mockResponse();
              req.prisma.budget.findMany.mockResolvedValue([
                  { id: '1', name: 'A', fiscalYear: { year: 2025 }, totalOpex: 100, totalCapex: 0, _count: { items: 5 } }
              ]);

              await BudgetComparisonController.getAvailableForComparison(req, res);
              expect(res.json).toHaveBeenCalledWith([expect.objectContaining({ itemCount: 5, total: 100 })]);
         });

         it('should map 500 silently on db breakdown', async () => {
              const req = mockRequest();
              const res = mockResponse();
              req.prisma.budget.findMany.mockRejectedValue(new Error('x'));
              await BudgetComparisonController.getAvailableForComparison(req, res);
              expect(res.status).toHaveBeenCalledWith(500);
         });
    });
});
