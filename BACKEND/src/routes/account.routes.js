const express = require('express');
const AccountController = require('../controllers/account.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/permission.middleware');
const { audit } = require('../middlewares/audit.middleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/', authorize('FINANCE', 'READ'), AccountController.index);
router.post('/', authorize('FINANCE', 'WRITE'), audit('FINANCE'), AccountController.create);
router.put('/:id', authorize('FINANCE', 'WRITE'), audit('FINANCE'), AccountController.update);
router.delete('/:id', authorize('FINANCE', 'DELETE'), audit('FINANCE'), AccountController.delete);

module.exports = router;
