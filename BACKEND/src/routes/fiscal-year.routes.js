const express = require('express');
const FiscalYearController = require('../controllers/fiscal-year.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/permission.middleware');
const { audit } = require('../middlewares/audit.middleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/', authorize('FINANCE', 'READ'), FiscalYearController.index);
router.post('/', authorize('FINANCE', 'WRITE'), audit('FINANCE'), FiscalYearController.create);
router.put('/:id', authorize('FINANCE', 'WRITE'), audit('FINANCE'), FiscalYearController.update);
router.delete('/:id', authorize('FINANCE', 'DELETE'), audit('FINANCE'), FiscalYearController.delete);

module.exports = router;
