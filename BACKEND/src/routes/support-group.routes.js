const express = require('express');
const router = express.Router();
const SupportGroupController = require('../controllers/support-group.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const { authorize, authorizeAny } = require('../middlewares/permission.middleware');

router.use(authMiddleware);

router.get('/active', authorizeAny('HELPDESK', ['READ', 'CREATE', 'VIEW_QUEUE']), SupportGroupController.indexActive);
router.get('/', authorize('HELPDESK', 'WRITE'), SupportGroupController.index);
router.post('/', authorize('HELPDESK', 'WRITE'), SupportGroupController.create);
router.patch('/:id', authorize('HELPDESK', 'WRITE'), SupportGroupController.update);
router.delete('/:id', authorize('HELPDESK', 'WRITE'), SupportGroupController.deactivate);

module.exports = router;
