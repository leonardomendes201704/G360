const express = require('express');
const ApprovalTierController = require('../controllers/approval-tier.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/permission.middleware');
const { audit } = require('../middlewares/audit.middleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/', authorize('CONFIG', 'READ'), ApprovalTierController.list);
router.post('/', authorize('CONFIG', 'WRITE'), audit('CONFIG'), ApprovalTierController.create);
router.put('/:id', authorize('CONFIG', 'WRITE'), audit('CONFIG'), ApprovalTierController.update);
router.delete('/:id', authorize('CONFIG', 'DELETE'), audit('CONFIG'), ApprovalTierController.destroy);

module.exports = router;
