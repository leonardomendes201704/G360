const BudgetScenarioService = require('../services/budget-scenario.service');
const BudgetInsightsService = require('../services/budget-insights.service');

class BudgetScenarioController {

    // === CENÁRIOS ===

    static async createFromMultiplier(req, res, next) {
        try {
            const { budgetId } = req.params;
            const { name, multiplier, description } = req.body;

            if (!name || multiplier === undefined) {
                return res.status(400).json({ message: 'Nome e multiplicador são obrigatórios.' });
            }

            const scenario = await BudgetScenarioService.createFromMultiplier(req.prisma, budgetId, name, multiplier, description, req.user.userId);

            res.status(201).json(scenario);
        } catch (error) {
            next(error);
        }
    }

    static async createCustom(req, res, next) {
        try {
            const { budgetId } = req.params;
            const { name, items, description } = req.body;

            if (!name || !items || !Array.isArray(items)) {
                return res.status(400).json({ message: 'Nome e items são obrigatórios.' });
            }

            const scenario = await BudgetScenarioService.createCustom(req.prisma, budgetId, name, items, description, req.user.userId);

            res.status(201).json(scenario);
        } catch (error) {
            next(error);
        }
    }

    static async getByBudgetId(req, res, next) {
        try {
            const { budgetId } = req.params;
            const scenarios = await BudgetScenarioService.getByBudgetId(req.prisma, budgetId, req.user.userId);
            res.json(scenarios);
        } catch (error) {
            next(error);
        }
    }

    static async compare(req, res, next) {
        try {
            const { scenarioId1, scenarioId2 } = req.query;

            if (!scenarioId1 || !scenarioId2) {
                return res.status(400).json({ message: 'Dois IDs de cenário são obrigatórios.' });
            }

            const comparison = await BudgetScenarioService.compare(req.prisma, scenarioId1, scenarioId2, req.user.userId);
            res.json(comparison);
        } catch (error) {
            next(error);
        }
    }

    static async getImpactAnalysis(req, res, next) {
        try {
            const { scenarioId } = req.params;
            const analysis = await BudgetScenarioService.generateImpactAnalysis(req.prisma, scenarioId, req.user.userId);
            res.json(analysis);
        } catch (error) {
            next(error);
        }
    }

    static async selectScenario(req, res, next) {
        try {
            const { scenarioId } = req.params;
            const scenario = await BudgetScenarioService.selectScenario(req.prisma, scenarioId, req.user.userId);
            res.json(scenario);
        } catch (error) {
            next(error);
        }
    }

    static async deleteScenario(req, res, next) {
        try {
            const { scenarioId } = req.params;
            await BudgetScenarioService.delete(req.prisma, scenarioId, req.user.userId);
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    }

    // === INSIGHTS ===

    static async getInsights(req, res, next) {
        try {
            const { budgetId } = req.params;
            const insights = await BudgetInsightsService.analyze(req.prisma, budgetId, req.user.userId);
            res.json(insights);
        } catch (error) {
            next(error);
        }
    }
}

module.exports = BudgetScenarioController;

