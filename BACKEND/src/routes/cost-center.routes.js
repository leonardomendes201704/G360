const express = require('express');
const CostCenterController = require('../controllers/cost-center.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/permission.middleware');
const { audit } = require('../middlewares/audit.middleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/', authorize('FINANCE', 'READ'), CostCenterController.index);
router.post('/', authorize('FINANCE', 'WRITE'), audit('CONFIG'), CostCenterController.create);
router.put('/:id', authorize('FINANCE', 'WRITE'), audit('CONFIG'), CostCenterController.update);
router.delete('/:id', authorize('FINANCE', 'DELETE'), audit('CONFIG'), CostCenterController.delete);

module.exports = router;