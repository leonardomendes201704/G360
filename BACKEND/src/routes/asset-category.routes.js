const express = require('express');
const AssetCategoryController = require('../controllers/asset-category.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/permission.middleware');
const { audit } = require('../middlewares/audit.middleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/', authorize('ASSETS', 'READ'), AssetCategoryController.index);
router.post('/', authorize('ASSETS', 'WRITE'), audit('ASSETS'), AssetCategoryController.create);
router.put('/:id', authorize('ASSETS', 'WRITE'), audit('ASSETS'), AssetCategoryController.update);
router.delete('/:id', authorize('ASSETS', 'DELETE'), audit('ASSETS'), AssetCategoryController.delete);

module.exports = router;