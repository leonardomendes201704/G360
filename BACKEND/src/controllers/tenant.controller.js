const TenantService = require('../services/tenant.service');
const TenantManager = require('../config/tenant-manager');
const TenantRepository = require('../repositories/tenant.repository');
const bcrypt = require('bcryptjs');
const logger = require('../config/logger');

/**
 * TenantController — Endpoints REST para gerenciamento de tenants.
 * Todas as rotas requerem Super Admin.
 * req.prisma é o catalogClient (schema public) via tenantResolverAdmin.
 */
class TenantController {

    /**
     * POST /api/tenants — Criar novo tenant com provisionamento completo.
     */
    static async create(req, res) {
        try {
            const catalogPrisma = TenantManager.getCatalogClient();
            const tenant = await TenantService.create(catalogPrisma, req.body);

            return res.status(201).json({
                status: 'success',
                message: 'Tenant criado e provisionado com sucesso.',
                data: tenant,
            });
        } catch (error) {
            logger.error('[TenantController] Create error:', error);
            const statusCode = error.statusCode || 500;
            return res.status(statusCode).json({
                status: 'error',
                message: error.message || 'Erro ao criar tenant.',
                details: error.details || undefined,
            });
        }
    }

    /**
     * GET /api/tenants — Listar todos os tenants.
     */
    static async findAll(req, res) {
        try {
            const catalogPrisma = TenantManager.getCatalogClient();
            const tenants = await TenantService.findAll(catalogPrisma);

            return res.json({
                status: 'success',
                data: tenants,
                total: tenants.length,
            });
        } catch (error) {
            logger.error('[TenantController] FindAll error:', error);
            return res.status(500).json({
                status: 'error',
                message: 'Erro ao listar tenants.',
            });
        }
    }

    /**
     * GET /api/tenants/:id — Buscar tenant por ID.
     */
    static async findById(req, res) {
        try {
            const catalogPrisma = TenantManager.getCatalogClient();
            const tenant = await TenantService.findById(catalogPrisma, req.params.id);

            return res.json({
                status: 'success',
                data: tenant,
            });
        } catch (error) {
            logger.error('[TenantController] FindById error:', error);
            const statusCode = error.statusCode || 500;
            return res.status(statusCode).json({
                status: 'error',
                message: error.message || 'Erro ao buscar tenant.',
            });
        }
    }

    /**
     * PUT /api/tenants/:id — Atualizar tenant.
     */
    static async update(req, res) {
        try {
            const catalogPrisma = TenantManager.getCatalogClient();
            const tenant = await TenantService.update(catalogPrisma, req.params.id, req.body);

            return res.json({
                status: 'success',
                message: 'Tenant atualizado com sucesso.',
                data: tenant,
            });
        } catch (error) {
            logger.error('[TenantController] Update error:', error);
            const statusCode = error.statusCode || 500;
            return res.status(statusCode).json({
                status: 'error',
                message: error.message || 'Erro ao atualizar tenant.',
            });
        }
    }

    /**
     * DELETE /api/tenants/:id — Desativar tenant (soft delete).
     */
    static async deactivate(req, res) {
        try {
            const catalogPrisma = TenantManager.getCatalogClient();
            const tenant = await TenantService.deactivate(catalogPrisma, req.params.id);

            return res.json({
                status: 'success',
                message: 'Tenant desativado com sucesso.',
                data: tenant,
            });
        } catch (error) {
            logger.error('[TenantController] Deactivate error:', error);
            const statusCode = error.statusCode || 500;
            return res.status(statusCode).json({
                status: 'error',
                message: error.message || 'Erro ao desativar tenant.',
            });
        }
    }

    /**
     * GET /api/tenants/pool-stats — Estatísticas do pool de clients.
     */
    static async poolStats(req, res) {
        try {
            const stats = TenantManager.getPoolStats();
            return res.json({
                status: 'success',
                data: stats,
            });
        } catch (error) {
            return res.status(500).json({
                status: 'error',
                message: 'Erro ao obter stats do pool.',
            });
        }
    }

    /**
     * GET /api/tenants/dashboard-stats — Estatísticas gerais para o Dashboard do Master.
     */
    static async dashboardStats(req, res) {
        try {
            const catalogPrisma = TenantManager.getCatalogClient();

            // 1. Contagens básicas
            const totalTenants = await catalogPrisma.$queryRaw`SELECT COUNT(*)::int as count FROM tenants`;
            const activeTenants = await catalogPrisma.$queryRaw`SELECT COUNT(*)::int as count FROM tenants WHERE is_active = true`;

            // 2. Distribuição por Plano
            const byPlan = await catalogPrisma.$queryRaw`
                SELECT plan, COUNT(*)::int as count 
                FROM tenants 
                GROUP BY plan
            `;

            // 3. Últimos tenants
            const recentTenants = await catalogPrisma.$queryRaw`
                SELECT name, slug, created_at, plan 
                FROM tenants 
                ORDER BY created_at DESC 
                LIMIT 5
            `;

            // 4. Pool Stats
            const poolStats = TenantManager.getPoolStats();

            return res.json({
                status: 'success',
                data: {
                    total: totalTenants[0].count,
                    active: activeTenants[0].count,
                    inactive: totalTenants[0].count - activeTenants[0].count,
                    byPlan: byPlan,
                    recent: recentTenants,
                    pool: poolStats
                }
            });
        } catch (error) {
            logger.error('[TenantController] DashboardStats error:', error);
            return res.status(500).json({ status: 'error', message: 'Erro ao obter stats do dashboard.' });
        }
    }

    /**
     * GET /api/tenants/:id/admin — Buscar admin user do tenant.
     */
    static async getAdmin(req, res) {
        try {
            const catalogPrisma = TenantManager.getCatalogClient();
            const tenant = await TenantRepository.findById(catalogPrisma, req.params.id);
            if (!tenant) return res.status(404).json({ status: 'error', message: 'Tenant não encontrado.' });

            const tenantPrisma = TenantManager.getClientForTenant(tenant.schemaName);
            const adminRole = await tenantPrisma.role.findFirst({ where: { name: 'Super Admin' } });
            if (!adminRole) return res.json({ status: 'success', data: null });

            const admin = await tenantPrisma.user.findFirst({
                where: { roles: { some: { id: adminRole.id } } },
                select: { id: true, name: true, email: true, isActive: true },
                orderBy: { createdAt: 'asc' },
            });

            return res.json({ status: 'success', data: admin });
        } catch (error) {
            logger.error('[TenantController] GetAdmin error:', error);
            return res.status(500).json({ status: 'error', message: 'Erro ao buscar admin do tenant.' });
        }
    }

    /**
     * PUT /api/tenants/:id/admin — Atualizar admin user do tenant.
     */
    static async updateAdmin(req, res) {
        try {
            const { email, password, name } = req.body;
            const catalogPrisma = TenantManager.getCatalogClient();
            const tenant = await TenantRepository.findById(catalogPrisma, req.params.id);
            if (!tenant) return res.status(404).json({ status: 'error', message: 'Tenant não encontrado.' });

            const tenantPrisma = TenantManager.getClientForTenant(tenant.schemaName);
            const adminRole = await tenantPrisma.role.findFirst({ where: { name: 'Super Admin' } });
            if (!adminRole) return res.status(404).json({ status: 'error', message: 'Role Super Admin não encontrada.' });

            const admin = await tenantPrisma.user.findFirst({
                where: { roles: { some: { id: adminRole.id } } },
                orderBy: { createdAt: 'asc' },
            });
            if (!admin) return res.status(404).json({ status: 'error', message: 'Admin não encontrado.' });

            const updateData = {};
            if (email) updateData.email = email;
            if (name) updateData.name = name;
            if (password) updateData.password = await bcrypt.hash(password, 10);

            const updated = await tenantPrisma.user.update({
                where: { id: admin.id },
                data: updateData,
                select: { id: true, name: true, email: true, isActive: true },
            });

            return res.json({ status: 'success', message: 'Admin atualizado com sucesso.', data: updated });
        } catch (error) {
            logger.error('[TenantController] UpdateAdmin error:', error);
            return res.status(500).json({ status: 'error', message: 'Erro ao atualizar admin.' });
        }
    }
}

module.exports = TenantController;
