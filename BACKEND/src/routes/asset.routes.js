const express = require('express');
const AssetController = require('../controllers/asset.controller');
const AssetMaintenanceController = require('../controllers/asset-maintenance.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/permission.middleware');
const { audit } = require('../middlewares/audit.middleware');

const router = express.Router();

router.use(authMiddleware);

// Rotas de Ativos
router.get('/', authorize('ASSETS', 'READ'), AssetController.index);
router.get('/:id', authorize('ASSETS', 'READ'), AssetController.show);
router.post('/', authorize('ASSETS', 'CREATE'), audit('ASSETS'), AssetController.create);
router.put('/:id', authorize('ASSETS', 'EDIT_ASSET'), audit('ASSETS'), AssetController.update);
router.delete('/:id', authorize('ASSETS', 'DELETE'), audit('ASSETS'), AssetController.delete);

// Rotas de Manutenção (Aninhadas)
router.get('/:id/maintenances', authorize('ASSETS', 'READ'), AssetMaintenanceController.index);
router.post('/:id/maintenances', authorize('ASSETS', 'MAINTAIN'), audit('ASSETS'), AssetMaintenanceController.create);
router.put('/maintenances/:maintenanceId', authorize('ASSETS', 'MAINTAIN'), audit('ASSETS'), AssetMaintenanceController.update);
router.delete('/maintenances/:maintenanceId', authorize('ASSETS', 'MAINTAIN'), audit('ASSETS'), AssetMaintenanceController.delete);

module.exports = router;