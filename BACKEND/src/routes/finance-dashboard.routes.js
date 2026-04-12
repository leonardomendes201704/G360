const express = require('express');
const FinanceDashboardController = require('../controllers/finance-dashboard.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/permission.middleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/overview', authorize('FINANCE', 'READ'), FinanceDashboardController.getBudgetOverview);
router.get('/evolution', authorize('FINANCE', 'READ'), FinanceDashboardController.getMonthlyEvolution);
router.get('/cost-centers', authorize('FINANCE', 'READ'), FinanceDashboardController.getCostCenterPerformance);
router.get('/accounts', authorize('FINANCE', 'READ'), FinanceDashboardController.getAccountPerformance);
router.get('/advanced-stats', authorize('FINANCE', 'READ'), FinanceDashboardController.getAdvancedStats);
router.get('/insights', authorize('FINANCE', 'READ'), FinanceDashboardController.getInsights);
router.get('/recent-activities', authorize('FINANCE', 'READ'), FinanceDashboardController.getRecentActivities);
router.get('/dre-details', authorize('FINANCE', 'READ'), FinanceDashboardController.getDREDetails);

module.exports = router;
