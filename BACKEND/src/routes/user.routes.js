const express = require('express');
const UserController = require('../controllers/user.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/permission.middleware');
const { audit } = require('../middlewares/audit.middleware');
const { validate } = require('../middlewares/validate.middleware');
const { createUserSchema, updateUserSchema, importAzureUsersSchema } = require('../validators/user.validator');

const router = express.Router();

router.use(authMiddleware);

router.post('/', authorize('CONFIG', 'WRITE'), validate(createUserSchema), audit('CONFIG'), UserController.create);
router.get('/', authorize('CONFIG', 'READ'), UserController.index);
router.put('/:id', authorize('CONFIG', 'WRITE'), validate(updateUserSchema), audit('CONFIG'), UserController.update);
router.delete('/:id', authorize('CONFIG', 'DELETE'), audit('CONFIG'), UserController.delete);
router.patch('/:id/toggle-status', authorize('CONFIG', 'WRITE'), audit('CONFIG'), UserController.toggleStatus);
router.post('/import-azure', authorize('CONFIG', 'WRITE'), validate(importAzureUsersSchema), audit('CONFIG'), UserController.importAzureUsers);

module.exports = router;
