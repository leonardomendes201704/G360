const ChangeTemplateRepository = require('../repositories/change-template.repository');
const { getUserAccessScope, getAccessibleUserIds } = require('../utils/access-scope');

/**
 * Change Template Service
 * Gerencia templates de mudanca padrao para GMUDs recorrentes
 */
class ChangeTemplateService {
    /**
     * Lista todos os templates ativos
     */
    static async getAll(prisma, userId) {
        const where = { isActive: true };
        if (userId) {
            const scope = await getUserAccessScope(prisma, userId);
            if (scope.isAdmin === false) {
                const accessibleUserIds = await getAccessibleUserIds(prisma, userId, scope);
                if (!accessibleUserIds || accessibleUserIds.length === 0) {
                    where.createdBy = '__NO_ACCESS__';
                } else {
                    where.createdBy = { in: accessibleUserIds };
                }
            }
        }

        return prisma.changeTemplate.findMany({
            where,
            orderBy: [
                { usageCount: 'desc' },
                { name: 'asc' }
            ]
        });
    }

    /**
     * Busca template por ID
     */
    static async getById(prisma, id, userId) {
        const template = await prisma.changeTemplate.findUnique({
            where: { id }
        });

        if (!template) {
            const error = new Error('Template nao encontrado.');
            error.statusCode = 404;
            throw error;
        }

        if (userId) {
            const scope = await getUserAccessScope(prisma, userId);
            if (scope.isAdmin === false) {
                const accessibleUserIds = await getAccessibleUserIds(prisma, userId, scope);
                if (!accessibleUserIds || !accessibleUserIds.includes(template.createdBy)) {
                    const error = new Error('Acesso negado.');
                    error.statusCode = 403;
                    throw error;
                }
            }
        }

        return template;
    }

    /**
     * Cria novo template
     */
    static async create(prisma, userId, data) {
        return prisma.changeTemplate.create({
            data: {
                name: data.name,
                description: data.description,
                type: data.type || 'PADRAO',
                riskLevel: data.riskLevel || 'BAIXO',
                impact: data.impact || 'MENOR',
                category: data.category,
                executionPlan: data.executionPlan,
                backoutPlan: data.backoutPlan,
                testPlan: data.testPlan,
                prerequisites: data.prerequisites,
                defaultDuration: data.defaultDuration || 60,
                autoApprove: data.autoApprove || false,
                createdBy: userId
            }
        });
    }

    /**
     * Atualiza template existente
     */
    static async update(prisma, id, data, userId) {
        // Verifica se existe
        await this.getById(prisma, id, userId);

        return prisma.changeTemplate.update({
            where: { id },
            data: {
                name: data.name,
                description: data.description,
                type: data.type,
                riskLevel: data.riskLevel,
                impact: data.impact,
                category: data.category,
                executionPlan: data.executionPlan,
                backoutPlan: data.backoutPlan,
                testPlan: data.testPlan,
                prerequisites: data.prerequisites,
                defaultDuration: data.defaultDuration,
                autoApprove: data.autoApprove,
                isActive: data.isActive
            }
        });
    }

    /**
     * Desativa template (soft delete)
     */
    static async delete(prisma, id, userId) {
        await this.getById(prisma, id, userId);

        return prisma.changeTemplate.update({
            where: { id },
            data: { isActive: false }
        });
    }

    /**
     * Incrementa contador de uso
     */
    static async incrementUsage(prisma, id) {
        return prisma.changeTemplate.update({
            where: { id },
            data: {
                usageCount: { increment: 1 }
            }
        });
    }

    /**
     * Aplica template a dados de GMUD
     * Retorna objeto pronto para criar GMUD
     */
    static async applyTemplate(prisma, templateId, userId) {
        const template = await this.getById(prisma, templateId, userId);

        // Incrementa uso
        await this.incrementUsage(prisma, templateId);

        // Calcula datas baseado na duracao padrao
        const now = new Date();
        const scheduledStart = new Date(now.getTime() + 24 * 60 * 60 * 1000); // +1 dia
        const scheduledEnd = new Date(scheduledStart.getTime() + template.defaultDuration * 60 * 1000);

        return {
            title: `[Template] ${template.name}`,
            description: template.description || '',
            type: template.type,
            riskLevel: template.riskLevel,
            impact: template.impact,
            executionPlan: template.executionPlan || '',
            backoutPlan: template.backoutPlan || '',
            testPlan: template.testPlan || '',
            prerequisites: template.prerequisites || '',
            scheduledStart: scheduledStart.toISOString(),
            scheduledEnd: scheduledEnd.toISOString(),
            // Se auto-approve, status ja vai como APPROVED
            status: template.autoApprove ? 'APPROVED' : 'DRAFT',
            _templateId: template.id,
            _templateName: template.name
        };
    }
}

module.exports = ChangeTemplateService;
