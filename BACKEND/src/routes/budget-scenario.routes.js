const express = require('express');
const router = express.Router();
const BudgetScenarioController = require('../controllers/budget-scenario.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/permission.middleware');
const { audit } = require('../middlewares/audit.middleware');

router.use(authMiddleware);

router.get('/budgets/:budgetId/scenarios', authorize('FINANCE', 'READ'), BudgetScenarioController.getByBudgetId);

router.post('/budgets/:budgetId/scenarios/multiplier', authorize('FINANCE', 'WRITE'), audit('FINANCE'), BudgetScenarioController.createFromMultiplier);

router.post('/budgets/:budgetId/scenarios/custom', authorize('FINANCE', 'WRITE'), audit('FINANCE'), BudgetScenarioController.createCustom);

router.get('/scenarios/compare', authorize('FINANCE', 'READ'), BudgetScenarioController.compare);

router.get('/scenarios/:scenarioId/impact', authorize('FINANCE', 'READ'), BudgetScenarioController.getImpactAnalysis);

router.post('/scenarios/:scenarioId/select', authorize('FINANCE', 'WRITE'), audit('FINANCE'), BudgetScenarioController.selectScenario);

router.delete('/scenarios/:scenarioId', authorize('FINANCE', 'DELETE'), audit('FINANCE'), BudgetScenarioController.deleteScenario);

router.get('/budgets/:budgetId/insights', authorize('FINANCE', 'READ'), BudgetScenarioController.getInsights);

module.exports = router;
