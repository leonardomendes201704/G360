const ProjectService = require('../../services/project.service');
const NotificationService = require('../../services/notification.service');
const { userCanApproveProjectCost, notifyProjectCostTierApprovers } = require('../../services/approval-tier.service');
const path = require('path');
const fs = require('fs');
const logger = require('../../config/logger');

class ProjectCostController {
    static async getCosts(req, res) {
        const { id } = req.params;
        await ProjectService.getById(req.prisma, id, req.user.userId);
        const costs = await req.prisma.projectCost.findMany({
            where: { projectId: id }, include: { supplier: true }, orderBy: { date: 'desc' }
        });
        return res.json(costs);
    }

    static async createCost(req, res) {
        const { id } = req.params;
        await ProjectService.getById(req.prisma, id, req.user.userId);
        const project = await req.prisma.project.findUnique({ where: { id } });
        if (!project) return res.status(404).json({ message: 'Projeto não encontrado' });
        if (project.approvalStatus !== 'APPROVED') {
            return res.status(403).json({ message: 'Ação não permitida. O projeto precisa estar APROVADO para lançar custos.' });
        }

        const winningProposal = await req.prisma.projectProposal.findFirst({ where: { projectId: id, isWinner: true } });
        if (!winningProposal) {
            return res.status(403).json({ message: 'Ação não permitida. É necessário ter uma proposta aprovada (vencedora) antes de lançar custos.' });
        }

        const { description, type, amount, date } = req.body;
        const file = req.file;
        const missingFields = [];
        if (!description || description.trim() === '') missingFields.push('Descrição');
        if (!type || type.trim() === '') missingFields.push('Tipo/Categoria');
        if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) missingFields.push('Valor');
        if (!date) missingFields.push('Data');
        if (!file) missingFields.push('Anexo (documento comprobatório)');
        if (missingFields.length > 0) {
            return res.status(400).json({ message: `Campos obrigatórios não preenchidos: ${missingFields.join(', ')}`, missingFields });
        }

        const { userId, tenantId } = req.user;
        let fileUrl = null, fileName = null;
        if (file) {
            const uploadsRoot = path.resolve(__dirname, '..', '..', '..');
            const relativePath = path.relative(uploadsRoot, file.path);
            fileUrl = `/${relativePath.split(path.sep).join('/')}`;
            fileName = file.originalname;
        }

        const cost = await req.prisma.projectCost.create({
            data: {
                projectId: id, description: req.body.description, type: req.body.type,
                amount: Number(req.body.amount), date: new Date(req.body.date),
                status: req.body.status || 'PREVISTO',
                supplierId: req.body.supplierId || null,
                invoiceNumber: req.body.invoiceNumber || null,
                dueDate: req.body.dueDate ? new Date(req.body.dueDate) : null,
                paymentDate: req.body.paymentDate ? new Date(req.body.paymentDate) : null,
                notes: req.body.notes || null,
                fileUrl, fileName, createdBy: userId
            },
            include: { supplier: true }
        });

        await ProjectCostController._updateProjectActualCost(req.prisma, id);

        await req.prisma.auditLog.create({
            data: {
                tenantId, userId,
                action: 'lançou custo', module: 'PROJECTS',
                entityId: id, entityType: 'PROJECT',
                newData: { description: cost.description, amount: cost.amount }
            }
        });

        return res.status(201).json(cost);
    }

    static async updateCost(req, res) {
        const { id, costId } = req.params;
        await ProjectService.getById(req.prisma, id, req.user.userId);
        const file = req.file;
        const existingCost = await req.prisma.projectCost.findUnique({ where: { id: costId } });
        if (!existingCost) return res.status(404).json({ message: 'Custo não encontrado' });
        if (['APROVADO', 'REALIZADO', 'PAGO'].includes(existingCost.status)) {
            return res.status(403).json({ message: 'Custo já aprovado/realizado não pode ser editado.' });
        }

        const updateData = {};
        if (req.body.description !== undefined) updateData.description = req.body.description;
        if (req.body.type !== undefined) updateData.type = req.body.type;
        if (req.body.amount !== undefined) updateData.amount = Number(req.body.amount);
        if (req.body.date !== undefined) updateData.date = new Date(req.body.date);
        if (req.body.status !== undefined) updateData.status = req.body.status;
        if (req.body.supplierId !== undefined) updateData.supplierId = req.body.supplierId || null;
        if (req.body.invoiceNumber !== undefined) updateData.invoiceNumber = req.body.invoiceNumber || null;
        if (req.body.dueDate !== undefined) updateData.dueDate = req.body.dueDate ? new Date(req.body.dueDate) : null;
        if (req.body.paymentDate !== undefined) updateData.paymentDate = req.body.paymentDate ? new Date(req.body.paymentDate) : null;
        if (req.body.notes !== undefined) updateData.notes = req.body.notes;

        if (file) {
            const uploadsRoot = path.resolve(__dirname, '..', '..', '..');
            const relativePath = path.relative(uploadsRoot, file.path);
            updateData.fileUrl = `/${relativePath.split(path.sep).join('/')}`;
            updateData.fileName = file.originalname;
        }

        const cost = await req.prisma.projectCost.update({ where: { id: costId }, data: updateData, include: { supplier: true } });
        await ProjectCostController._updateProjectActualCost(req.prisma, id);
        return res.json(cost);
    }

    static async deleteCost(req, res) {
        const { id, costId } = req.params;
        await ProjectService.getById(req.prisma, id, req.user.userId);
        const cost = await req.prisma.projectCost.findUnique({ where: { id: costId } });
        if (!cost) return res.status(404).json({ message: 'Custo não encontrado' });
        if (['APROVADO', 'REALIZADO', 'PAGO'].includes(cost.status)) {
            return res.status(403).json({ message: 'Custo já aprovado/realizado não pode ser excluído.' });
        }
        if (cost.fileUrl) {
            const filePath = path.join(__dirname, '..', '..', '..', cost.fileUrl);
            try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch (e) { logger.error(e); }
        }
        await req.prisma.projectCost.delete({ where: { id: costId } });
        await ProjectCostController._updateProjectActualCost(req.prisma, id);
        return res.status(204).send();
    }

    static async submitCostForApproval(req, res) {
        const { costId } = req.params;
        const { invoiceNumber, invoiceValue, dueDate, notes } = req.body;
        const file = req.file;

        const cost = await req.prisma.projectCost.findUnique({ where: { id: costId } });
        if (!cost) return res.status(404).json({ message: 'Custo não encontrado' });
        if (cost.status !== 'PREVISTO' && cost.status !== 'NAO_PREVISTO' && cost.status !== 'RETURNED') {
            return res.status(400).json({ message: 'Apenas custos previstos, não previstos ou devolvidos podem ser submetidos' });
        }

        const updateData = {
            status: 'AGUARDANDO_APROVACAO',
            invoiceNumber: invoiceNumber || null,
            invoiceValue: invoiceValue ? Number(invoiceValue) : null,
            dueDate: dueDate ? new Date(dueDate) : null,
            notes: notes || null,
            rejectionReason: null, requiresAdjustment: false
        };

        if (!file && !cost.fileUrl) {
            return res.status(400).json({ message: 'É obrigatório anexar a Nota Fiscal/Comprovante (PDF) para submeter o custo para aprovação' });
        }
        if (file) {
            const uploadsRoot = path.resolve(__dirname, '..', '..', '..');
            const relativePath = path.relative(uploadsRoot, file.path);
            updateData.fileUrl = `/${relativePath.split(path.sep).join('/')}`;
            updateData.fileName = file.originalname;
        }

        const updated = await req.prisma.projectCost.update({ where: { id: costId }, data: updateData, include: { supplier: true } });
        const project = await req.prisma.project.findUnique({
            where: { id: cost.projectId },
            select: { name: true, code: true, managerId: true },
        });
        if (project?.managerId) {
            const label = `${project.code || ''} ${project.name || ''}`.trim() || 'Projeto';
            await NotificationService.createNotification(
                req.prisma,
                project.managerId,
                'Custo de projeto pendente de aprovação',
                `Um custo de R$ ${updated.amount} no projeto "${label}" aguarda sua aprovação.`,
                'INFO',
                '/approvals'
            );
        }
        await notifyProjectCostTierApprovers(req.prisma, updated, {
            project,
            alreadyNotifiedManagerId: project?.managerId || undefined,
        });
        return res.json(updated);
    }

    static async approveCost(req, res) {
        const { id, costId } = req.params;
        await ProjectService.getById(req.prisma, id, req.user.userId);
        const { userId } = req.user;

        const cost = await req.prisma.projectCost.findUnique({ where: { id: costId } });
        if (!cost) return res.status(404).json({ message: 'Custo não encontrado' });
        if (cost.projectId !== id) return res.status(400).json({ message: 'Custo não pertence a este projeto' });
        if (cost.status !== 'AGUARDANDO_APROVACAO') {
            return res.status(400).json({ message: 'Apenas custos aguardando aprovação podem ser aprovados' });
        }
        if (!(await userCanApproveProjectCost(req.prisma, userId, cost))) {
            return res.status(403).json({ message: 'Sem permissão para aprovar este custo' });
        }

        const updated = await req.prisma.projectCost.update({
            where: { id: costId },
            data: { status: 'REALIZADO', paymentDate: new Date(), approvedBy: userId, approvedAt: new Date() },
            include: { supplier: true }
        });
        await ProjectCostController._updateProjectActualCost(req.prisma, id);
        return res.json(updated);
    }

    static async rejectCost(req, res) {
        const { id, costId } = req.params;
        const { userId } = req.user;
        const { reason } = req.body;
        await ProjectService.getById(req.prisma, id, userId);

        const cost = await req.prisma.projectCost.findUnique({ where: { id: costId } });
        if (!cost) return res.status(404).json({ message: 'Custo não encontrado' });
        if (cost.projectId !== id) return res.status(400).json({ message: 'Custo não pertence a este projeto' });
        if (cost.status !== 'AGUARDANDO_APROVACAO') {
            return res.status(400).json({ message: 'Apenas custos aguardando aprovação podem ser rejeitados' });
        }
        if (!(await userCanApproveProjectCost(req.prisma, userId, cost))) {
            return res.status(403).json({ message: 'Sem permissão para rejeitar este custo' });
        }

        const updated = await req.prisma.projectCost.update({
            where: { id: costId },
            data: { status: 'PREVISTO', notes: reason ? `Rejeitado: ${reason}` : null },
            include: { supplier: true }
        });
        return res.json(updated);
    }

    static async _updateProjectActualCost(prisma, projectId) {
        try {
            const result = await prisma.projectCost.aggregate({
                where: { projectId, status: { in: ['REALIZADO'] } },
                _sum: { amount: true }
            });
            await prisma.project.update({
                where: { id: projectId },
                data: { actualCost: result._sum.amount || 0 }
            });
        } catch (e) {
            logger.error(`Erro ao atualizar custo do projeto ${projectId}:`, e);
        }
    }
}

module.exports = ProjectCostController;
