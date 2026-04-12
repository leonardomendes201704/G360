const express = require('express');
const IntegrationController = require('../controllers/integration.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/permission.middleware');
const { audit } = require('../middlewares/audit.middleware');

const router = express.Router();

router.get('/public', IntegrationController.getActive);

router.use(authMiddleware);

router.get('/', authorize('CONFIG', 'READ'), IntegrationController.index);
router.put('/:type', authorize('CONFIG', 'WRITE'), audit('CONFIG'), IntegrationController.update);
router.post('/:type/test', authorize('CONFIG', 'WRITE'), audit('CONFIG'), IntegrationController.test);

module.exports = router;
