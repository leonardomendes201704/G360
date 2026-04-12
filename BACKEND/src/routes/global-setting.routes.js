const express = require('express');
const GlobalSettingController = require('../controllers/global-setting.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const { authorizeSuperAdmin } = require('../middlewares/permission.middleware');
const { tenantResolver } = require('../middlewares/tenant-resolver.middleware');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: GlobalSettings
 *   description: Configurações Globais da Plataforma — Super Admin only
 */

// Health check first (before :category param match)
router.get('/system-health', authMiddleware, tenantResolver(), authorizeSuperAdmin, GlobalSettingController.systemHealth);

// Initialize default settings
router.post('/initialize', authMiddleware, tenantResolver(), authorizeSuperAdmin, GlobalSettingController.initialize);

// SMTP test
router.post('/test-smtp', authMiddleware, tenantResolver(), authorizeSuperAdmin, GlobalSettingController.testSmtp);

// List all
router.get('/', authMiddleware, tenantResolver(), authorizeSuperAdmin, GlobalSettingController.findAll);

// List by category
router.get('/:category', authMiddleware, tenantResolver(), authorizeSuperAdmin, GlobalSettingController.findByCategory);

// Bulk update
router.put('/', authMiddleware, tenantResolver(), authorizeSuperAdmin, GlobalSettingController.update);

module.exports = router;
