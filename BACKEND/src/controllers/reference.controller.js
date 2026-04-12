/**
 * Reference Controller
 * Provides lightweight reference data for cross-module lookups
 * These endpoints require authentication but NOT module-specific permissions
 */

const logger = require('../config/logger');

class ReferenceController {
    /**
     * Get suppliers for reference (dropdown, etc.)
     * Returns only id and name - no sensitive data
     */
    static async getSuppliers(req, res) {
        try {
            const suppliers = await req.prisma.supplier.findMany({
                select: { id: true, name: true, document: true },
                orderBy: { name: 'asc' }
            });
            return res.json(suppliers);
        } catch (error) {
            logger.error('Error fetching reference suppliers:', error);
            return res.status(500).json({ error: 'Erro ao buscar fornecedores.' });
        }
    }

    /**
     * Get accounting accounts for reference
     */
    static async getAccounts(req, res) {
        try {
            const accounts = await req.prisma.accountingAccount.findMany({
                select: { id: true, name: true, code: true },
                orderBy: { code: 'asc' }
            });
            return res.json(accounts);
        } catch (error) {
            logger.error('Error fetching reference accounts:', error);
            return res.status(500).json({ error: 'Erro ao buscar contas.' });
        }
    }

    /**
     * Get cost centers for reference
     */
    static async getCostCenters(req, res) {
        try {
            const costCenters = await req.prisma.costCenter.findMany({
                select: { id: true, name: true, code: true, managerId: true },
                orderBy: { name: 'asc' }
            });
            return res.json(costCenters);
        } catch (error) {
            logger.error('Error fetching reference cost centers:', error);
            return res.status(500).json({ error: 'Erro ao buscar centros de custo.' });
        }
    }

    /**
     * Get cost centers scoped to the current user (manager or member)
     * Admins get all cost centers
     */
    static async getMyCostCenters(req, res) {
        try {
            const { getUserAccessScope, getScopedCostCenterIds } = require('../utils/access-scope');
            const scope = await getUserAccessScope(req.prisma, req.user.userId || req.user.id);

            if (scope.isAdmin) {
                const costCenters = await req.prisma.costCenter.findMany({
                    select: { id: true, name: true, code: true },
                    orderBy: { name: 'asc' }
                });
                return res.json({ isAdmin: true, costCenters });
            }

            const allowedIds = getScopedCostCenterIds(scope);
            if (!allowedIds || allowedIds.length === 0) {
                return res.json({ isAdmin: false, costCenters: [] });
            }

            const costCenters = await req.prisma.costCenter.findMany({
                where: { id: { in: allowedIds } },
                select: { id: true, name: true, code: true },
                orderBy: { name: 'asc' }
            });
            return res.json({ isAdmin: false, costCenters });
        } catch (error) {
            logger.error('Error fetching scoped cost centers:', error);
            return res.status(500).json({ error: 'Erro ao buscar centros de custo.' });
        }
    }

    /**
     * Get contracts for reference
     */
    static async getContracts(req, res) {
        try {
            const contracts = await req.prisma.contract.findMany({
                select: {
                    id: true,
                    number: true,
                    description: true,
                    supplierId: true
                },
                orderBy: { number: 'asc' }
            });
            return res.json(contracts);
        } catch (error) {
            logger.error('Error fetching reference contracts:', error);
            return res.status(500).json({ error: 'Erro ao buscar contratos.' });
        }
    }

    /**
     * Get users for reference (assignment dropdowns)
     */
    static async getUsers(req, res) {
        try {
            const users = await req.prisma.user.findMany({
                where: { isActive: true },
                select: { id: true, name: true, email: true },
                orderBy: { name: 'asc' }
            });
            return res.json(users);
        } catch (error) {
            logger.error('Error fetching reference users:', error);
            return res.status(500).json({ error: 'Erro ao buscar usuários.' });
        }
    }
}

module.exports = ReferenceController;
