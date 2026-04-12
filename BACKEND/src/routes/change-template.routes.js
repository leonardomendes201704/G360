const express = require('express');
const ChangeTemplateController = require('../controllers/change-template.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/permission.middleware');
const { audit } = require('../middlewares/audit.middleware');

const router = express.Router();

router.use(authMiddleware);

// CRUD de Templates
router.get('/', authorize('GMUD', 'READ'), ChangeTemplateController.index);
router.get('/:id', authorize('GMUD', 'READ'), ChangeTemplateController.show);
router.post('/', authorize('GMUD', 'WRITE'), audit('GMUD'), ChangeTemplateController.create);
router.put('/:id', authorize('GMUD', 'WRITE'), audit('GMUD'), ChangeTemplateController.update);
router.delete('/:id', authorize('GMUD', 'DELETE'), audit('GMUD'), ChangeTemplateController.delete);

// Aplicar template para criar GMUD
router.post('/:id/apply', authorize('GMUD', 'WRITE'), audit('GMUD'), ChangeTemplateController.apply);

module.exports = router;
