const express = require('express');
const BudgetComparisonController = require('../controllers/budget-comparison.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/permission.middleware');
const { audit } = require('../middlewares/audit.middleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/available', authorize('FINANCE', 'READ'), BudgetComparisonController.getAvailableForComparison);

router.post('/', authorize('FINANCE', 'READ'), audit('FINANCE'), BudgetComparisonController.compare);

router.post('/multi', authorize('FINANCE', 'READ'), audit('FINANCE'), BudgetComparisonController.compareMultiple);

module.exports = router;
