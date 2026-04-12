const express = require('express');
const router = express.Router();
const HelpdeskConfigController = require('../controllers/helpdesk-config.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const { authorize, authorizeAny } = require('../middlewares/permission.middleware');

router.use(authMiddleware);

router.get('/', authorizeAny('HELPDESK', ['READ', 'VIEW_QUEUE']), HelpdeskConfigController.show);
router.put('/', authorize('HELPDESK', 'WRITE'), HelpdeskConfigController.update);

module.exports = router;
