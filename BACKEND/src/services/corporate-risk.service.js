const CorporateRiskRepository = require('../repositories/corporate-risk.repository');
// const { PrismaClient } = require('@prisma/client');
// const prisma = new PrismaClient();
const { getUserAccessScope, getAccessibleUserIds } = require('../utils/access-scope');

const calculateSeverity = (probability, impact) => {
    const probMap = { 'MUITO_BAIXA': 1, 'BAIXA': 2, 'MEDIA': 3, 'ALTA': 4, 'MUITO_ALTA': 5 };
    const pactMap = { 'MUITO_BAIXO': 1, 'BAIXO': 2, 'MEDIO': 3, 'ALTO': 4, 'CRITICO': 5 };

    const probVal = probMap[probability] || 1;
    const pactVal = pactMap[impact] || 1;

    return probVal * pactVal;
};

exports.create = async (prisma, data, userId) => {
    // Sanitize optional Foreign Keys
    const sanitizedData = { ...data };
    ['departmentId', 'assetId', 'supplierId', 'ownerId'].forEach(field => {
        if (sanitizedData[field] === '') sanitizedData[field] = null;
    });

    const severity = calculateSeverity(sanitizedData.probability, sanitizedData.impact);

    // Generate Code (Simple sequential or timestamp based for MVP)
    const count = await prisma.corporateRisk.count();
    const year = new Date().getFullYear();
    const code = `RISK-${year}-${String(count + 1).padStart(3, '0')}`;

    return await prisma.corporateRisk.create({
        data: {
            ...sanitizedData,
            code,
            severity,
            ownerId: sanitizedData.ownerId || userId, // Default to creator if not specified
            status: 'IDENTIFICADO'
        },
        include: {
            owner: true,
            department: true,
            asset: true,
            supplier: true
        }
    });
};

/**
 * Buscar todos os riscos com isolamento por centro de custo
 * - Admin: vê todos os riscos
 * - Gestor: vê riscos onde o owner está no seu centro de custo
 * - Usuário comum: vê apenas riscos onde ele é o owner
 */
exports.findAll = async (prisma, filters, userId) => {
    const scope = await getUserAccessScope(prisma, userId);
    const where = {};

    // Aplicar filtro de escopo baseado no owner do risco
    if (!scope.isAdmin) {
        // Buscar IDs de usuários acessíveis (do mesmo CC ou subordinados)
        const accessibleUserIds = await getAccessibleUserIds(prisma, userId, scope);
        if (accessibleUserIds) {
            where.ownerId = { in: accessibleUserIds };
        }
    }

    // Filtros adicionais do cliente
    if (filters.status) where.status = filters.status;
    if (filters.category) where.category = filters.category;
    if (filters.ownerId) where.ownerId = filters.ownerId;
    if (filters.minSeverity) where.severity = { gte: parseInt(filters.minSeverity) };
    if (filters.departmentId) where.departmentId = filters.departmentId;

    return await prisma.corporateRisk.findMany({
        where,
        include: {
            owner: { select: { id: true, name: true, avatar: true } },
            department: { select: { id: true, name: true } },
            mitigationTasks: { select: { id: true, title: true, status: true } }
        },
        orderBy: { severity: 'desc' }
    });
};

/**
 * Buscar risco por ID com verificação de acesso
 */
exports.findById = async (prisma, id, userId = null) => {
    const risk = await prisma.corporateRisk.findUnique({
        where: { id },
        include: {
            owner: true,
            department: true,
            asset: true,
            supplier: true,
            mitigationTasks: true
        }
    });

    if (!risk) return null;

    // Se userId fornecido, verificar acesso
    if (userId) {
        const scope = await getUserAccessScope(prisma, userId);
        if (!scope.isAdmin) {
            const accessibleUserIds = await getAccessibleUserIds(prisma, userId, scope);
            if (accessibleUserIds && !accessibleUserIds.includes(risk.ownerId)) {
                const error = new Error('Acesso negado.');
                error.statusCode = 403;
                throw error;
            }
        }
    }

    return risk;
};

exports.update = async (prisma, id, data, userId = null) => {
    // Verificar acesso se userId fornecido
    if (userId) {
        await this.findById(prisma, id, userId);
    }

    // Sanitize optional Foreign Keys
    const sanitizedData = { ...data };
    ['departmentId', 'assetId', 'supplierId', 'ownerId'].forEach(field => {
        if (sanitizedData[field] === '') sanitizedData[field] = null;
    });

    // Recalculate severity if critical fields change
    let severity = undefined;
    if (sanitizedData.probability || sanitizedData.impact) {
        const current = await this.findById(prisma, id);
        const p = sanitizedData.probability || current.probability;
        const i = sanitizedData.impact || current.impact;
        severity = calculateSeverity(p, i);
    }

    return await prisma.corporateRisk.update({
        where: { id },
        data: {
            ...sanitizedData,
            ...(severity && { severity })
        },
        include: {
            owner: true
        }
    });
};

exports.delete = async (prisma, id, userId = null) => {
    // Verificar acesso se userId fornecido
    if (userId) {
        await this.findById(prisma, id, userId);
    }

    return await prisma.corporateRisk.delete({
        where: { id }
    });
};

/**
 * Métricas do Heatmap com isolamento por centro de custo
 * - Admin: vê todos os riscos no heatmap
 * - Gestor: vê apenas riscos onde o owner está no seu centro de custo
 */
exports.getHeatmapMetrics = async (prisma, userId = null) => {
    let whereClause = {};

    if (userId) {
        const scope = await getUserAccessScope(prisma, userId);
        if (!scope.isAdmin) {
            const accessibleUserIds = await getAccessibleUserIds(prisma, userId, scope);
            if (accessibleUserIds) {
                whereClause.ownerId = { in: accessibleUserIds };
            }
        }
    }

    // Aggregation for 5x5 Matrix
    // Group by Probability and Impact with scope filter
    const distribution = await prisma.corporateRisk.groupBy({
        by: ['probability', 'impact'],
        where: whereClause,
        _count: {
            id: true
        }
    });

    return distribution;
};
