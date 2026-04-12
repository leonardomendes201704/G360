const express = require('express');
const BudgetController = require('../controllers/budget.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/permission.middleware');
const { audit } = require('../middlewares/audit.middleware');
const { validate } = require('../middlewares/validate.middleware');
const { createBudgetSchema, duplicateBudgetSchema, addBudgetItemSchema } = require('../validators/budget.validator');

const router = express.Router();

router.use(authMiddleware);

router.get('/', authorize('FINANCE', 'READ'), BudgetController.index);
router.post('/', authorize('FINANCE', 'EDIT_BUDGET'), validate(createBudgetSchema), audit('FINANCE'), BudgetController.create);
router.get('/:id', authorize('FINANCE', 'READ'), BudgetController.show);
router.put('/:id', authorize('FINANCE', 'EDIT_BUDGET'), audit('FINANCE'), BudgetController.update);
router.patch('/:id/submit-approval', authorize('FINANCE', 'EDIT_BUDGET'), audit('FINANCE'), BudgetController.submitForApproval);
router.patch('/:id/approve', authorize('FINANCE', 'WRITE'), audit('FINANCE'), BudgetController.approve);
router.post('/:id/duplicate', authorize('FINANCE', 'WRITE'), validate(duplicateBudgetSchema), audit('FINANCE'), BudgetController.duplicate);
router.delete('/:id', authorize('FINANCE', 'DELETE'), audit('FINANCE'), BudgetController.delete);
router.post('/:id/items', authorize('FINANCE', 'WRITE'), validate(addBudgetItemSchema), audit('FINANCE'), BudgetController.addItem);

const upload = require('../config/upload')('temp/budgets');

// ROTAS PARA ITENS
router.put('/items/:itemId', authorize('FINANCE', 'WRITE'), audit('FINANCE'), BudgetController.updateItem);
router.delete('/items/:itemId', authorize('FINANCE', 'DELETE'), audit('FINANCE'), BudgetController.deleteItem);

// ROTA DE IMPORTAÇÃO (Excel)
router.post('/:id/import', authorize('FINANCE', 'WRITE'), upload, audit('FINANCE'), BudgetController.importItems);

module.exports = router;