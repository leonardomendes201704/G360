const express = require('express');
const TenantController = require('../controllers/tenant.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const { authorizeSuperAdmin } = require('../middlewares/permission.middleware');
const { tenantResolver } = require('../middlewares/tenant-resolver.middleware');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Tenants
 *   description: Gerenciamento de Tenants (Multi-Tenant) — Super Admin only
 */

// Dashboard stats for Master Admin
router.get('/dashboard-stats', authMiddleware, tenantResolver(), authorizeSuperAdmin, TenantController.dashboardStats);

// Pool stats (before :id to avoid conflict)
router.get('/pool-stats', authMiddleware, tenantResolver(), authorizeSuperAdmin, TenantController.poolStats);

/**
 * @swagger
 * /tenants:
 *   get:
 *     summary: Listar todos os tenants
 *     tags: [Tenants]
 *     responses:
 *       200:
 *         description: Lista de tenants
 */
router.get('/', authMiddleware, tenantResolver(), authorizeSuperAdmin, TenantController.findAll);

// Admin user management for a specific tenant
router.get('/:id/admin', authMiddleware, tenantResolver(), authorizeSuperAdmin, TenantController.getAdmin);
router.put('/:id/admin', authMiddleware, tenantResolver(), authorizeSuperAdmin, TenantController.updateAdmin);

/**
 * @swagger
 * /tenants/{id}:
 *   get:
 *     summary: Buscar tenant por ID
 *     tags: [Tenants]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 */
router.get('/:id', authMiddleware, tenantResolver(), authorizeSuperAdmin, TenantController.findById);

/**
 * @swagger
 * /tenants:
 *   post:
 *     summary: Criar novo tenant (provisiona schema + seed)
 *     tags: [Tenants]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, slug]
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Empresa Alpha Ltda"
 *               slug:
 *                 type: string
 *                 example: "empresa-alpha"
 *               plan:
 *                 type: string
 *                 enum: [STANDARD, PREMIUM, ENTERPRISE]
 *                 default: STANDARD
 *               maxUsers:
 *                 type: integer
 *                 default: 50
 *               adminEmail:
 *                 type: string
 *                 example: "admin@empresa-alpha.com"
 *               adminPassword:
 *                 type: string
 *                 example: "senhaSegura123"
 */
router.post('/', authMiddleware, tenantResolver(), authorizeSuperAdmin, TenantController.create);

/**
 * @swagger
 * /tenants/{id}:
 *   put:
 *     summary: Atualizar tenant
 *     tags: [Tenants]
 */
router.put('/:id', authMiddleware, tenantResolver(), authorizeSuperAdmin, TenantController.update);

/**
 * @swagger
 * /tenants/{id}:
 *   delete:
 *     summary: Desativar tenant (soft delete)
 *     tags: [Tenants]
 */
router.delete('/:id', authMiddleware, tenantResolver(), authorizeSuperAdmin, TenantController.deactivate);

module.exports = router;
