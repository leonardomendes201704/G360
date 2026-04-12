const NotificationService = require('../../services/notification.service');
const ProjectService = require('../../services/project.service');

class ProjectRiskController {
    static async getRisks(req, res) {
        const { id } = req.params;
        await ProjectService.getById(req.prisma, id, req.user.userId);
        const risks = await req.prisma.projectRisk.findMany({ where: { projectId: id }, orderBy: { createdAt: 'desc' } });
        return res.json(risks);
    }

    static async createRisk(req, res) {
        const { id } = req.params;
        await ProjectService.getById(req.prisma, id, req.user.userId);
        const { tenantId, userId } = req.user;

        const { description, category, probability, impact, mitigation, status, owner, mitigationPlan, contingencyPlan } = req.body;
        const risk = await req.prisma.projectRisk.create({
            data: { description, category, probability, impact, mitigation, status, owner, mitigationPlan, contingencyPlan, projectId: id }
        });

        await req.prisma.auditLog.create({
            data: {
                tenantId, userId,
                action: 'registrou um risco',
                module: 'PROJECTS',
                entityId: id,
                entityType: 'PROJECT',
                newData: { risk: risk.description, level: risk.impact }
            }
        });

        try {
            const project = await req.prisma.project.findUnique({ where: { id } });
            if (project && project.managerId) {
                await NotificationService.createNotification(req.prisma, project.managerId,
                    'Novo Risco Registrado',
                    `Um novo risco foi identificado no projeto ${project.name}: ${risk.description}`,
                    'WARNING',
                    `/projects/${id}`
                );
            }
        } catch (e) { }

        return res.status(201).json(risk);
    }

    static async updateRisk(req, res) {
        const { riskId } = req.params;
        const existingRisk = await req.prisma.projectRisk.findUnique({ where: { id: riskId }, select: { projectId: true } });
        if (!existingRisk) return res.status(404).json({ message: 'Risco nao encontrado.' });
        await ProjectService.getById(req.prisma, existingRisk.projectId, req.user.userId);
        const { description, category, probability, impact, mitigation, status, owner, mitigationPlan, contingencyPlan } = req.body;
        const risk = await req.prisma.projectRisk.update({ where: { id: riskId }, data: { description, category, probability, impact, mitigation, status, owner, mitigationPlan, contingencyPlan } });
        return res.json(risk);
    }

    static async deleteRisk(req, res) {
        const { riskId } = req.params;
        const existingRisk = await req.prisma.projectRisk.findUnique({ where: { id: riskId }, select: { projectId: true } });
        if (!existingRisk) return res.status(404).json({ message: 'Risco nao encontrado.' });
        await ProjectService.getById(req.prisma, existingRisk.projectId, req.user.userId);
        await req.prisma.projectRisk.delete({ where: { id: riskId } });
        return res.status(204).send();
    }
}

module.exports = ProjectRiskController;
