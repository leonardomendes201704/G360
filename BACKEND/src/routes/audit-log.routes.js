const router = require('express').Router();
const AuditLogController = require('../controllers/audit-log.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/permission.middleware');

router.use(authMiddleware);

router.get('/', authorize('ACTIVITY_LOG', 'READ'), AuditLogController.list);
router.get('/export', authorize('ACTIVITY_LOG', 'READ'), AuditLogController.exportCsv);

module.exports = router;
