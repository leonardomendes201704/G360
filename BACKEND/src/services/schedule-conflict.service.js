const ScheduleConflictRepository = require('../repositories/schedule-conflict.repository');
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

    return { OR: orConditions };
};

/**
 * Schedule Conflict Service
 * Verifica conflitos de horário entre GMUDs para ajudar na coordenação de mudanças
 */
class ScheduleConflictService {
    /**
     * Verifica se há GMUDs conflitantes com o período especificado
     * @param {Date} scheduledStart - Início planejado
     * @param {Date} scheduledEnd - Fim planejado
     * @param {string} excludeId - ID da GMUD a excluir (para edição)
     * @returns {Array} Lista de GMUDs conflitantes
     */
    static async checkConflicts(prisma, scheduledStart, scheduledEnd, excludeId = null, userId) {
        const start = new Date(scheduledStart);
        const end = new Date(scheduledEnd);
        const conflicts = [];

        // 1. Check Freeze Windows (Governance)
        const FreezeWindowService = require('./freeze-window.service');
        const freeze = await FreezeWindowService.checkFreeze(start, end);

        if (freeze) {
            conflicts.push({
                id: freeze.id,
                code: 'FREEZE', // Special code for UI
                title: `Janela de Congelamento: ${freeze.name}`,
                type: 'FREEZE_WINDOW',
                riskLevel: 'CRITICO',
                status: 'ATIVO',
                description: freeze.description
            });
        }

        const accessWhere = await buildAccessWhere(prisma, userId);

        // 2. Check Conflicting GMUDs
        const conflictingGMUDs = await prisma.changeRequest.findMany({
            where: {
                id: excludeId ? { not: excludeId } : undefined,
                status: {
                    in: ['PENDING_APPROVAL', 'APPROVED', 'APPROVED_WAITING_EXECUTION', 'WAITING_CAB']
                },
                AND: [
                    {
                        OR: [
                            // GMUD existente comeca durante o periodo novo
                            {
                                scheduledStart: { gte: start, lt: end }
                            },
                            // GMUD existente termina durante o periodo novo
                            {
                                scheduledEnd: { gt: start, lte: end }
                            },
                            // GMUD existente engloba completamente o periodo novo
                            {
                                scheduledStart: { lte: start },
                                scheduledEnd: { gte: end }
                            }
                        ]
                    },
                    accessWhere
                ]
            },
            select: {
                id: true,
                code: true,
                title: true,
                type: true,
                riskLevel: true,
                status: true,
                scheduledStart: true,
                scheduledEnd: true,
                requester: {
                    select: { name: true }
                },
                assets: {
                    select: { name: true, code: true }
                }
            },
            orderBy: { scheduledStart: 'asc' }
        });

        return [...conflicts, ...conflictingGMUDs];
    }

    /**
     * Retorna o Forward Schedule of Changes (FSC) - Calendário consolidado
     * @param {Date} startDate - Data inicial do período
     * @param {Date} endDate - Data final do período
     * @returns {Array} Lista de GMUDs no período
     */
    static async getForwardSchedule(prisma, startDate, endDate, userId) {
        const start = new Date(startDate);
        const end = new Date(endDate);

        const accessWhere = await buildAccessWhere(prisma, userId);

        const gmuds = await prisma.changeRequest.findMany({
            where: {
                status: {
                    in: ['PENDING_APPROVAL', 'APPROVED', 'APPROVED_WAITING_EXECUTION', 'WAITING_CAB', 'EXECUTED']
                },
                AND: [
                    {
                        OR: [
                            // GMUD comeca no periodo
                            { scheduledStart: { gte: start, lte: end } },
                            // GMUD termina no periodo
                            { scheduledEnd: { gte: start, lte: end } },
                            // GMUD engloba o periodo
                            { scheduledStart: { lte: start }, scheduledEnd: { gte: end } }
                        ]
                    },
                    accessWhere
                ]
            },
            select: {
                id: true,
                code: true,
                title: true,
                type: true,
                riskLevel: true,
                status: true,
                scheduledStart: true,
                scheduledEnd: true,
                requester: {
                    select: { name: true }
                },
                assets: {
                    select: { name: true, code: true }
                }
            },
            orderBy: { scheduledStart: 'asc' }
        });

        // Agrupar por data para facilitar exibicao em calendario
        const byDate = {};
        gmuds.forEach(gmud => {
            const dateKey = new Date(gmud.scheduledStart).toISOString().split('T')[0];
            if (!byDate[dateKey]) {
                byDate[dateKey] = [];
            }
            byDate[dateKey].push(gmud);
        });

        return {
            gmuds,
            byDate,
            summary: {
                total: gmuds.length,
                byRisk: {
                    BAIXO: gmuds.filter(g => g.riskLevel === 'BAIXO').length,
                    MEDIO: gmuds.filter(g => g.riskLevel === 'MEDIO').length,
                    ALTO: gmuds.filter(g => g.riskLevel === 'ALTO').length,
                    CRITICO: gmuds.filter(g => g.riskLevel === 'CRITICO').length
                },
                byType: {
                    NORMAL: gmuds.filter(g => g.type === 'NORMAL').length,
                    EMERGENCIAL: gmuds.filter(g => g.type === 'EMERGENCIAL').length,
                    PADRAO: gmuds.filter(g => g.type === 'PADRAO').length
                }
            }
        };
    }

    /**
     * Retorna datas com múltiplas GMUDs (dias de alta concentração)
     * @param {Date} startDate - Data inicial
     * @param {Date} endDate - Data final
     * @returns {Array} Datas com múltiplas GMUDs
     */
    static async getHighConcentrationDays(prisma, startDate, endDate, userId) {
        const schedule = await this.getForwardSchedule(prisma, startDate, endDate, userId);

        const highConcentration = Object.entries(schedule.byDate)
            .filter(([_, gmuds]) => gmuds.length > 1)
            .map(([date, gmuds]) => ({
                date,
                count: gmuds.length,
                gmuds: gmuds.map(g => ({
                    code: g.code,
                    title: g.title,
                    riskLevel: g.riskLevel
                }))
            }))
            .sort((a, b) => b.count - a.count);

        return highConcentration;
    }
}

module.exports = ScheduleConflictService;



