const express = require('express');
const router = express.Router();
const ServiceCatalogController = require('../controllers/service-catalog.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const { authorize, authorizeAny } = require('../middlewares/permission.middleware');

router.use(authMiddleware);

router.get('/', authorizeAny('HELPDESK', ['READ', 'CREATE', 'VIEW_QUEUE']), ServiceCatalogController.index);

router.get('/categories', authorizeAny('HELPDESK', ['READ', 'CREATE', 'VIEW_QUEUE']), ServiceCatalogController.categories);

// Gerência (Apenas Administradores do Help Desk)
router.post('/categories', authorize('HELPDESK', 'WRITE'), ServiceCatalogController.createCategory);
router.put('/categories/:id', authorize('HELPDESK', 'WRITE'), ServiceCatalogController.updateCategory);
router.delete('/categories/:id', authorize('HELPDESK', 'DELETE'), ServiceCatalogController.deleteCategory);

router.post('/', authorize('HELPDESK', 'WRITE'), ServiceCatalogController.createService);
router.put('/:id', authorize('HELPDESK', 'WRITE'), ServiceCatalogController.updateService);
router.delete('/:id', authorize('HELPDESK', 'DELETE'), ServiceCatalogController.deleteService);

module.exports = router;
