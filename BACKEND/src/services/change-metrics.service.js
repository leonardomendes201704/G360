const ChangeMetricsRepository = require('../repositories/change-metrics.repository');
const { getUserAccessScope, getAccessibleUserIds } = require('../utils/access-scope');

const buildAccessWhere = async (prisma, userId) => {
    if (!userId) return {};
    const scope = await getUserAccessScope(prisma, userId);
    if (scope.isAdmin) return {};

    const accessibleUserIds = await getAccessibleUserIds(prisma, userId, scope);
    const orConditions = [];

    if (accessibleUserIds && accessibleUserIds.length > 0) {
        orConditions.push({ requesterId: { in: accessibleUserIds } });
    }

    orConditions.push({ approvers: { some: { userId } } });

    if (scope.isManager && scope.accessibleCostCenterIds && scope.accessibleCostCenterIds.length > 0) {
        orConditions.push({ assets: { some: { costCenterId: { in: scope.accessibleCostCenterIds } } } });
    }

    if (orConditions.length === 0) {
        return { id: '__NO_ACCESS__' };
    }

    return { OR: orConditions };
};

/**
 * GMUD Metrics Service
 * Calcula metricas de eficiencia e governanca para GMUDs
 */
class ChangeMetricsService {
    /**
     * Calcula metricas gerais de GMUDs
     * @param {Object} filters - Filtros opcionais (startDate, endDate)
     * @returns {Object} Metricas consolidadas
     */
    static async getMetrics(prisma, filters = {}, userId) {
        const { startDate, endDate } = filters;

        // Periodo padrao: ultimos 30 dias
        const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const end = endDate ? new Date(endDate) : new Date();

        const dateFilter = {
            createdAt: { gte: start, lte: end }
        };

        const accessWhere = await buildAccessWhere(prisma, userId);
        const scopedWhere = { ...dateFilter };
        if (Object.keys(accessWhere).length > 0) {
            scopedWhere.AND = [accessWhere];
        }

        // Total de GMUDs no periodo
        const total = await prisma.changeRequest.count({ where: scopedWhere });

        // GMUDs por status
        const byStatus = await prisma.changeRequest.groupBy({
            by: ['status'],
            _count: { id: true },
            where: scopedWhere
        });

        // GMUDs por tipo
        const byType = await prisma.changeRequest.groupBy({
            by: ['type'],
            _count: { id: true },
            where: scopedWhere
        });

        // GMUDs por risco
        const byRisk = await prisma.changeRequest.groupBy({
            by: ['riskLevel'],
            _count: { id: true },
            where: scopedWhere
        });

        // Taxa de sucesso (EXECUTED / (EXECUTED + FAILED))
        const executed = byStatus.find(s => s.status === 'EXECUTED')?._count?.id || 0;
        const failed = byStatus.find(s => s.status === 'FAILED')?._count?.id || 0;
        const successRate = executed + failed > 0 ? ((executed / (executed + failed)) * 100).toFixed(1) : 100;

        // MTTR (Mean Time to Resolution)
        const executedWhere = {
            createdAt: { gte: start, lte: end },
            status: { in: ['EXECUTED', 'FAILED'] },
            actualEnd: { not: null }
        };
        if (Object.keys(accessWhere).length > 0) {
            executedWhere.AND = [accessWhere];
        }

        const executedGmuds = await prisma.changeRequest.findMany({
            where: executedWhere,
            select: { actualStart: true, actualEnd: true, scheduledStart: true, scheduledEnd: true }
        });

        let mttrHours = 0;
        if (executedGmuds.length > 0) {
            const totalHours = executedGmuds.reduce((acc, g) => {
                const startTime = new Date(g.actualStart || g.scheduledStart);
                const endTime = new Date(g.actualEnd || g.scheduledEnd);
                return acc + ((endTime - startTime) / (1000 * 60 * 60));
            }, 0);
            mttrHours = (totalHours / executedGmuds.length).toFixed(1);
        }

        // Variacao Planejado vs Real
        const onTimeDelivery = executedGmuds.filter(g => {
            if (!g.actualEnd || !g.scheduledEnd) return true;
            return new Date(g.actualEnd) <= new Date(g.scheduledEnd);
        }).length;
        const onTimeRate = executedGmuds.length > 0
            ? ((onTimeDelivery / executedGmuds.length) * 100).toFixed(1)
            : 100;

        // Top 5 dias com mais GMUDs
        const byDayRequests = await prisma.changeRequest.findMany({
            where: scopedWhere,
            select: { scheduledStart: true }
        });

        const byDayMap = {};
        byDayRequests.forEach(row => {
            const day = new Date(row.scheduledStart).toISOString().split('T')[0];
            byDayMap[day] = (byDayMap[day] || 0) + 1;
        });

        const safeByDay = Object.entries(byDayMap)
            .map(([day, count]) => ({ day, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        return {
            period: { start, end },
            summary: {
                total,
                successRate: parseFloat(successRate),
                mttrHours: parseFloat(mttrHours),
                onTimeRate: parseFloat(onTimeRate)
            },
            byStatus: byStatus.reduce((acc, s) => ({ ...acc, [s.status]: s._count.id }), {}),
            byType: byType.reduce((acc, t) => ({ ...acc, [t.type]: t._count.id }), {}),
            byRisk: byRisk.reduce((acc, r) => ({ ...acc, [r.riskLevel]: r._count.id }), {}),
            highConcetrationDays: safeByDay
        };
    }

    /**
     * Relatorio PIR consolidado
     * @param {Object} filters - Filtros opcionais
     * @returns {Array} Lista de GMUDs falhas/canceladas com PIR
     */
    static async getPIRReport(prisma, filters = {}, userId) {
        const { startDate, endDate } = filters;
        const start = startDate ? new Date(startDate) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        const end = endDate ? new Date(endDate) : new Date();

        const accessWhere = await buildAccessWhere(prisma, userId);
        const where = {
            createdAt: { gte: start, lte: end },
            status: { in: ['FAILED', 'CANCELLED'] },
            rootCause: { not: null }
        };
        if (Object.keys(accessWhere).length > 0) {
            where.AND = [accessWhere];
        }

        const gmudsWithPIR = await prisma.changeRequest.findMany({
            where,
            select: {
                id: true,
                code: true,
                title: true,
                status: true,
                riskLevel: true,
                rootCause: true,
                lessonsLearned: true,
                preventiveActions: true,
                createdAt: true,
                updatedAt: true,
                requester: { select: { name: true } }
            },
            orderBy: { updatedAt: 'desc' }
        });

        // Analise de padroes nas causas raiz
        const rootCausePatterns = {};
        gmudsWithPIR.forEach(g => {
            const cause = g.rootCause?.toLowerCase() || '';
            if (cause.includes('ambiente')) rootCausePatterns['Ambiente'] = (rootCausePatterns['Ambiente'] || 0) + 1;
            if (cause.includes('comunicacao')) rootCausePatterns['Comunicacao'] = (rootCausePatterns['Comunicacao'] || 0) + 1;
            if (cause.includes('teste')) rootCausePatterns['Testes Insuficientes'] = (rootCausePatterns['Testes Insuficientes'] || 0) + 1;
            if (cause.includes('tempo') || cause.includes('prazo')) rootCausePatterns['Prazo Insuficiente'] = (rootCausePatterns['Prazo Insuficiente'] || 0) + 1;
            if (cause.includes('tecnic')) rootCausePatterns['Tecnico'] = (rootCausePatterns['Tecnico'] || 0) + 1;
        });

        return {
            period: { start, end },
            totalPIRs: gmudsWithPIR.length,
            rootCausePatterns,
            pirs: gmudsWithPIR
        };
    }

    /**
     * Tendencias mensais
     * @returns {Array} Dados para grafico de tendencias
     */
    static async getTrends(prisma, userId) {
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const accessWhere = await buildAccessWhere(prisma, userId);
        const trendsWhere = { createdAt: { gte: sixMonthsAgo } };
        if (Object.keys(accessWhere).length > 0) {
            trendsWhere.AND = [accessWhere];
        }

        const gmuds = await prisma.changeRequest.findMany({
            where: trendsWhere,
            select: { createdAt: true, status: true, riskLevel: true }
        });

        // Agrupar por mes
        const byMonth = {};
        gmuds.forEach(g => {
            const monthKey = `${g.createdAt.getFullYear()}-${String(g.createdAt.getMonth() + 1).padStart(2, '0')}`;
            if (!byMonth[monthKey]) {
                byMonth[monthKey] = { total: 0, executed: 0, failed: 0, critico: 0 };
            }
            byMonth[monthKey].total++;
            if (g.status === 'EXECUTED') byMonth[monthKey].executed++;
            if (g.status === 'FAILED') byMonth[monthKey].failed++;
            if (g.riskLevel === 'CRITICO') byMonth[monthKey].critico++;
        });

        return Object.entries(byMonth).map(([month, data]) => ({
            month,
            ...data,
            successRate: data.executed + data.failed > 0
                ? ((data.executed / (data.executed + data.failed)) * 100).toFixed(1)
                : 100
        }));
    }
}

module.exports = ChangeMetricsService;
