const express = require('express');
const RoleController = require('../controllers/role.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/permission.middleware');
const { audit } = require('../middlewares/audit.middleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/', authorize('CONFIG', 'READ'), RoleController.index);
router.post('/', authorize('CONFIG', 'WRITE'), audit('CONFIG'), RoleController.create);
router.put('/:id', authorize('CONFIG', 'WRITE'), audit('CONFIG'), RoleController.update);
router.delete('/:id', authorize('CONFIG', 'DELETE'), audit('CONFIG'), RoleController.delete);

module.exports = router;
