const express = require('express');
const ApprovalController = require('../controllers/approval.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const { authorize, authorizeAny } = require('../middlewares/permission.middleware');
const { audit } = require('../middlewares/audit.middleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/counts', authorize('APPROVALS', 'READ'), ApprovalController.getCounts);
router.get('/pending', authorize('APPROVALS', 'READ'), ApprovalController.getPending);
router.get('/history', authorize('APPROVALS', 'READ'), ApprovalController.getHistory);
router.get('/:type/:id/detail', authorize('APPROVALS', 'READ'), ApprovalController.getDetail);

router.post(
    '/:type/:id/approve',
    authorizeAny('APPROVALS', ['WRITE', 'BYPASS_APPROVAL']),
    audit('APPROVALS'),
    ApprovalController.approve
);
router.post(
    '/:type/:id/reject',
    authorizeAny('APPROVALS', ['WRITE', 'BYPASS_APPROVAL']),
    audit('APPROVALS'),
    ApprovalController.reject
);

module.exports = router;
