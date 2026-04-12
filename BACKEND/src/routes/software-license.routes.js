const express = require('express');
const SoftwareLicenseController = require('../controllers/software-license.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/permission.middleware');
const { audit } = require('../middlewares/audit.middleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/', SoftwareLicenseController.index);
router.get('/:id', SoftwareLicenseController.show);
router.post('/', authorize('ASSETS', 'WRITE'), audit('LICENCAS'), SoftwareLicenseController.create);
router.put('/:id', authorize('ASSETS', 'WRITE'), audit('LICENCAS'), SoftwareLicenseController.update);
router.delete('/:id', authorize('ASSETS', 'DELETE'), audit('LICENCAS'), SoftwareLicenseController.delete);

module.exports = router;