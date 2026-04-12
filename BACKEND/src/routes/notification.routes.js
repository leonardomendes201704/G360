const router = require('express').Router();
const NotificationController = require('../controllers/notification.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/permission.middleware');
const { audit } = require('../middlewares/audit.middleware');

/** SSE: JWT curto `purpose=sse` em ?token= (emitido por POST /auth/stream-token); tenantResolver + authorize */
router.get('/stream', authorize('NOTIFICATIONS', 'READ'), NotificationController.stream);

router.use(authMiddleware);

router.get('/', authorize('NOTIFICATIONS', 'READ'), NotificationController.list);
router.put('/read-all', authorize('NOTIFICATIONS', 'WRITE'), audit('NOTIFICATIONS'), NotificationController.markAllAsRead);
router.put('/:id/read', authorize('NOTIFICATIONS', 'WRITE'), audit('NOTIFICATIONS'), NotificationController.markAsRead);

module.exports = router;
