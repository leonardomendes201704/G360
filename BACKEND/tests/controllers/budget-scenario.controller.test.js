const BudgetScenarioController = require('../../src/controllers/budget-scenario.controller');
const BudgetScenarioService = require('../../src/services/budget-scenario.service');
const BudgetInsightsService = require('../../src/services/budget-insights.service');
jest.mock('../../src/services/budget-scenario.service');
jest.mock('../../src/services/budget-insights.service');

describe('BudgetScenarioController', () => {
    let req, res, next;
    beforeEach(() => {
        req = { body: {}, params: { budgetId: 'b1', scenarioId: 's1' }, query: {}, user: { userId: 'u1' }, prisma: {} };
        res = { status: jest.fn().mockReturnThis(), json: jest.fn(), send: jest.fn() };
        next = jest.fn();
    });

    it('createFromMultiplier — 201', async () => {
        BudgetScenarioService.createFromMultiplier.mockResolvedValue({ id: 's1' });
        req.body = { name: 'Optimistic', multiplier: 1.1 };
        await BudgetScenarioController.createFromMultiplier(req, res, next);
        expect(res.status).toHaveBeenCalledWith(201);
    });

    it('createFromMultiplier — 400 on missing name', async () => {
        req.body = { multiplier: 1.1 };
        await BudgetScenarioController.createFromMultiplier(req, res, next);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('createCustom — 201', async () => {
        BudgetScenarioService.createCustom.mockResolvedValue({ id: 's2' });
        req.body = { name: 'Custom', items: [{ amount: 100 }] };
        await BudgetScenarioController.createCustom(req, res, next);
        expect(res.status).toHaveBeenCalledWith(201);
    });

    it('createCustom — 400 on missing items', async () => {
        req.body = { name: 'Custom' };
        await BudgetScenarioController.createCustom(req, res, next);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('getByBudgetId — 200', async () => {
        BudgetScenarioService.getByBudgetId.mockResolvedValue([]);
        await BudgetScenarioController.getByBudgetId(req, res, next);
        expect(res.json).toHaveBeenCalledWith([]);
    });

    it('compare — 400 on missing IDs', async () => {
        req.query = {};
        await BudgetScenarioController.compare(req, res, next);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('compare — 200 with both IDs', async () => {
        BudgetScenarioService.compare.mockResolvedValue({ diff: 100 });
        req.query = { scenarioId1: 's1', scenarioId2: 's2' };
        await BudgetScenarioController.compare(req, res, next);
        expect(res.json).toHaveBeenCalledWith({ diff: 100 });
    });

    it('getImpactAnalysis — 200', async () => {
        BudgetScenarioService.generateImpactAnalysis.mockResolvedValue({ impact: 'low' });
        await BudgetScenarioController.getImpactAnalysis(req, res, next);
        expect(res.json).toHaveBeenCalled();
    });

    it('selectScenario — 200', async () => {
        BudgetScenarioService.selectScenario.mockResolvedValue({ id: 's1', selected: true });
        await BudgetScenarioController.selectScenario(req, res, next);
        expect(res.json).toHaveBeenCalled();
    });

    it('deleteScenario — 204', async () => {
        BudgetScenarioService.delete.mockResolvedValue();
        await BudgetScenarioController.deleteScenario(req, res, next);
        expect(res.status).toHaveBeenCalledWith(204);
    });

    it('getInsights — 200', async () => {
        BudgetInsightsService.analyze.mockResolvedValue({ recommendations: [] });
        await BudgetScenarioController.getInsights(req, res, next);
        expect(res.json).toHaveBeenCalled();
    });
});
