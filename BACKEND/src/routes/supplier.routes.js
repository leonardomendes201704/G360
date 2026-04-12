const express = require('express');
const SupplierController = require('../controllers/supplier.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/permission.middleware');
const { audit } = require('../middlewares/audit.middleware');
const { validate } = require('../middlewares/validate.middleware');
const { createSupplierSchema, updateSupplierSchema } = require('../validators/supplier.validator');

const router = express.Router();

router.use(authMiddleware);

router.get('/', authorize('SUPPLIERS', 'READ'), SupplierController.index);
router.get('/:id', authorize('SUPPLIERS', 'READ'), SupplierController.show);
router.post('/', authorize('SUPPLIERS', 'CREATE'), validate(createSupplierSchema), audit('SUPPLIERS'), SupplierController.create);
router.put('/:id', authorize('SUPPLIERS', 'EDIT_SUPPLIER'), validate(updateSupplierSchema), audit('SUPPLIERS'), SupplierController.update);
router.delete('/:id', authorize('SUPPLIERS', 'DELETE'), audit('SUPPLIERS'), SupplierController.delete);

module.exports = router;