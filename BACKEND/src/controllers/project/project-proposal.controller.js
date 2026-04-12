const ProjectService = require('../../services/project.service');
const path = require('path');
const fs = require('fs');
const logger = require('../../config/logger');
const { notifyProposalTierApprovers } = require('../../services/approval-tier.service');

class ProjectProposalController {
    static async getProposals(req, res) {
        const { id } = req.params;
        await ProjectService.getById(req.prisma, id, req.user.userId);
        const proposals = await req.prisma.projectProposal.findMany({
            where: { projectId: id, isActive: true },
            include: { supplier: true },
            orderBy: { value: 'asc' }
        });
        return res.json(proposals);
    }

    static async createProposal(req, res) {
        const { id } = req.params;
        await ProjectService.getById(req.prisma, id, req.user.userId);
        const project = await req.prisma.project.findUnique({ where: { id } });
        if (!project) return res.status(404).json({ message: 'Projeto não encontrado' });
        if (project.approvalStatus !== 'APPROVED') {
            return res.status(403).json({ message: 'Ação não permitida. O projeto precisa estar APROVADO para lançar propostas.' });
        }

        const { supplierId, value } = req.body;
        const file = req.file;
        const missingFields = [];
        if (!supplierId || supplierId.trim() === '') missingFields.push('Fornecedor');
        if (!value || isNaN(Number(value)) || Number(value) <= 0) missingFields.push('Valor');
        if (!file) missingFields.push('Anexo (proposta comercial)');
        if (missingFields.length > 0) {
            return res.status(400).json({ message: `Campos obrigatórios não preenchidos: ${missingFields.join(', ')}`, missingFields });
        }

        let fileUrl = null, fileName = null;
        if (file) {
            const uploadsRoot = path.resolve(__dirname, '..', '..', '..');
            const relativePath = path.relative(uploadsRoot, file.path);
            fileUrl = `/${relativePath.split(path.sep).join('/')}`;
            fileName = file.originalname;
        }

        const proposal = await req.prisma.projectProposal.create({
            data: { projectId: id, supplierId, value: Number(value), isWinner: false, fileUrl, fileName }
        });
        return res.status(201).json(proposal);
    }

    static async updateProposal(req, res) {
        const { id } = req.params;
        await ProjectService.getById(req.prisma, id, req.user.userId);
        const { proposalId } = req.params;
        const { isWinner, status, ...otherData } = req.body;
        const { userId, role } = req.user;

        const sanitizedData = { ...otherData };
        if (sanitizedData.validity === '' || sanitizedData.validity === undefined) sanitizedData.validity = null;
        else if (sanitizedData.validity) sanitizedData.validity = new Date(sanitizedData.validity);
        if (sanitizedData.file) delete sanitizedData.file;

        if (isWinner === true) {
            const project = await req.prisma.project.findUnique({ where: { id } });
            if (!project) return res.status(404).json({ message: 'Projeto não encontrado' });
            const isManager = project.managerId === userId;
            const isSuperAdmin = role === 'SUPER_ADMIN' || role === 'ADMIN';
            if (!isManager && !isSuperAdmin) {
                return res.status(403).json({ message: 'Apenas o gestor do projeto ou administradores podem aprovar propostas como vencedoras.' });
            }
            const [_, updatedProposal] = await req.prisma.$transaction([
                req.prisma.projectProposal.updateMany({ where: { projectId: id }, data: { isWinner: false } }),
                req.prisma.projectProposal.update({
                    where: { id: proposalId },
                    data: { isWinner: true, status: 'APROVADA', ...sanitizedData },
                    include: { supplier: true }
                })
            ]);
            return res.json(updatedProposal);
        }

        const proposal = await req.prisma.projectProposal.update({
            where: { id: proposalId }, data: sanitizedData, include: { supplier: true }
        });
        return res.json(proposal);
    }

    static async deleteProposal(req, res) {
        const { id, proposalId } = req.params;
        await ProjectService.getById(req.prisma, id, req.user.userId);
        const { userId, role } = req.user;
        const { justification } = req.body || {};

        const proposal = await req.prisma.projectProposal.findUnique({ where: { id: proposalId } });
        if (!proposal) return res.status(404).json({ message: 'Proposta não encontrada' });

        if (proposal.isWinner || proposal.status === 'APROVADA') {
            const project = await req.prisma.project.findUnique({ where: { id: proposal.projectId } });
            const isManager = project?.managerId === userId;
            const isAdmin = role === 'SUPER_ADMIN' || role === 'ADMIN';
            if (!isManager && !isAdmin) {
                return res.status(403).json({ message: 'Apenas gestores ou administradores podem inativar propostas aprovadas.' });
            }
            if (!justification || justification.trim() === '') {
                return res.status(400).json({ message: 'Justificativa obrigatória para inativar proposta aprovada.' });
            }
            await req.prisma.projectProposal.update({
                where: { id: proposalId },
                data: { isActive: false, inactivationReason: justification.trim(), inactivatedBy: userId, inactivatedAt: new Date() }
            });
            return res.json({ message: 'Proposta inativada com sucesso', inactivated: true });
        }

        if (proposal.fileUrl) {
            const filePath = path.join(__dirname, '..', '..', '..', proposal.fileUrl);
            try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch (e) { logger.error(e); }
        }
        await req.prisma.projectProposal.delete({ where: { id: proposalId } });
        return res.status(204).send();
    }

    static async submitProposal(req, res) {
        const { proposalId } = req.params;
        const proposal = await req.prisma.projectProposal.findUnique({ where: { id: proposalId }, include: { supplier: true } });
        if (!proposal) return res.status(404).json({ message: 'Proposta não encontrada' });
        if (proposal.status !== 'RASCUNHO' && proposal.status !== 'DEVOLVIDA') {
            return res.status(400).json({ message: 'Apenas propostas em rascunho ou devolvidas podem ser submetidas para aprovação' });
        }
        const missingFields = [];
        if (!proposal.supplierId) missingFields.push('Fornecedor');
        if (!proposal.value || proposal.value <= 0) missingFields.push('Valor');
        if (!proposal.fileUrl) missingFields.push('Anexo (proposta comercial)');
        if (missingFields.length > 0) {
            return res.status(400).json({ message: `Campos obrigatórios não preenchidos: ${missingFields.join(', ')}`, missingFields });
        }
        const updated = await req.prisma.projectProposal.update({
            where: { id: proposalId }, data: { status: 'AGUARDANDO_APROVACAO' }, include: { supplier: true }
        });
        try {
            if (proposal.projectId) {
                const project = await req.prisma.project.findUnique({ where: { id: proposal.projectId } });
                await notifyProposalTierApprovers(req.prisma, updated, {
                    alreadyNotifiedManagerId: project?.managerId,
                });
            } else {
                await notifyProposalTierApprovers(req.prisma, updated, {});
            }
        } catch (e) {
            logger.error(e);
        }
        return res.json(updated);
    }

    static async setPaymentCondition(req, res) {
        const { proposalId } = req.params;
        const { entryPercent, installments, startDate, value } = req.body;
        const proposal = await req.prisma.projectProposal.findUnique({ where: { id: proposalId } });
        if (!proposal) return res.status(404).json({ message: 'Proposta não encontrada' });
        if (!proposal.isWinner) return res.status(400).json({ message: 'Apenas propostas vencedoras podem ter condição comercial' });

        const updated = await req.prisma.projectProposal.update({
            where: { id: proposalId },
            data: {
                paymentCondition: { entryPercent, installments, startDate, value: value || proposal.value },
                value: value || proposal.value
            },
            include: { supplier: true }
        });
        return res.json(updated);
    }

    static async generateCostsFromProposal(req, res) {
        const { proposalId } = req.params;
        const { userId } = req.user;

        const proposal = await req.prisma.projectProposal.findUnique({ where: { id: proposalId }, include: { supplier: true } });
        if (!proposal) return res.status(404).json({ message: 'Proposta não encontrada' });
        if (!proposal.isWinner) return res.status(400).json({ message: 'Apenas propostas vencedoras podem gerar custos' });
        if (!proposal.paymentCondition) return res.status(400).json({ message: 'Defina a condição comercial antes de gerar custos' });
        if (proposal.costsGenerated) return res.status(400).json({ message: 'Custos já foram gerados para esta proposta' });

        const { entryPercent = 0, installments = 1, startDate, value } = proposal.paymentCondition;
        const totalValue = Number(value || proposal.value);
        const baseDate = new Date(startDate || new Date());
        const costsToCreate = [];
        let remaining = totalValue;
        let seq = 1;

        if (entryPercent > 0) {
            const entryAmount = totalValue * (entryPercent / 100);
            remaining -= entryAmount;
            costsToCreate.push({
                projectId: proposal.projectId, proposalId: proposal.id, sequenceNumber: seq++,
                description: `${proposal.supplier?.name} - Entrada`, type: 'ENTRADA',
                amount: entryAmount, date: baseDate, dueDate: baseDate,
                status: 'PREVISTO', supplierId: proposal.supplierId, createdBy: userId
            });
        }

        const installmentAmount = remaining / installments;
        for (let i = 1; i <= installments; i++) {
            const dueDate = new Date(baseDate);
            dueDate.setMonth(dueDate.getMonth() + i);
            costsToCreate.push({
                projectId: proposal.projectId, proposalId: proposal.id, sequenceNumber: seq++,
                description: `${proposal.supplier?.name} - Parcela ${i}/${installments}`, type: 'PARCELA',
                amount: installmentAmount, date: dueDate, dueDate: dueDate,
                status: 'PREVISTO', supplierId: proposal.supplierId, createdBy: userId
            });
        }

        await req.prisma.projectCost.createMany({ data: costsToCreate });
        await req.prisma.projectProposal.update({ where: { id: proposalId }, data: { costsGenerated: true } });
        const createdCosts = await req.prisma.projectCost.findMany({
            where: { proposalId: proposal.id }, include: { supplier: true }, orderBy: { sequenceNumber: 'asc' }
        });
        return res.status(201).json(createdCosts);
    }
}

module.exports = ProjectProposalController;
