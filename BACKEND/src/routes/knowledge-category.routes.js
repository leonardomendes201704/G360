const router = require('express').Router();
const KnowledgeCategoryController = require('../controllers/knowledge-category.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const { authorize, authorizeSuperAdmin } = require('../middlewares/permission.middleware');
const { audit } = require('../middlewares/audit.middleware');

router.get('/', authMiddleware, authorize('KB', 'READ'), KnowledgeCategoryController.index);
router.get('/:id', authMiddleware, authorize('KB', 'READ'), KnowledgeCategoryController.show);

router.post('/', authMiddleware, authorize('KB', 'CREATE'), audit('KB'), KnowledgeCategoryController.create);
router.put('/:id', authMiddleware, authorize('KB', 'EDIT_ARTICLE'), audit('KB'), KnowledgeCategoryController.update);
router.delete('/:id', authMiddleware, authorize('KB', 'DELETE'), audit('KB'), KnowledgeCategoryController.delete);

router.post('/seed', authMiddleware, authorizeSuperAdmin, KnowledgeCategoryController.seedDefaults);

module.exports = router;
