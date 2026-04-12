const express = require('express');
const ExpenseController = require('../controllers/expense.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/permission.middleware');
const createUpload = require('../config/upload');
const { audit } = require('../middlewares/audit.middleware');
const { validate } = require('../middlewares/validate.middleware');
const { createExpenseSchema, updateExpenseSchema } = require('../validators/expense.validator');

const router = express.Router();
const upload = createUpload('expenses'); // Pasta uploads/expenses

router.use(authMiddleware);

router.post('/', authorize('FINANCE', 'WRITE'), upload, validate(createExpenseSchema), audit('FINANCE'), ExpenseController.create);
router.put('/:id', authorize('FINANCE', 'WRITE'), upload, validate(updateExpenseSchema), audit('FINANCE'), ExpenseController.update);

router.get('/', authorize('FINANCE', 'VIEW_INVOICES'), ExpenseController.index);
router.get('/:id', authorize('FINANCE', 'VIEW_INVOICES'), ExpenseController.show);

// Workflow de Aprovação
router.post('/:id/submit-approval', authorize('FINANCE', 'WRITE'), audit('FINANCE'), ExpenseController.submitForApproval);

router.delete('/:id', authorize('FINANCE', 'DELETE'), audit('FINANCE'), ExpenseController.delete);

module.exports = router;