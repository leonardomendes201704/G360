const express = require('express');
const router = express.Router();
const SlaPolicyController = require('../controllers/sla-policy.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/permission.middleware');

router.use(authMiddleware);

router.get('/', authorize('HELPDESK', 'READ'), SlaPolicyController.getAll);
router.post('/', authorize('HELPDESK', 'WRITE'), SlaPolicyController.create);
router.delete('/:id', authorize('HELPDESK', 'DELETE'), SlaPolicyController.delete);

module.exports = router;
