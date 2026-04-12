const NotificationService = require('../../services/notification.service');
const ProjectService = require('../../services/project.service');
const path = require('path');
const fs = require('fs');
const logger = require('../../config/logger');
const {
  userCanApproveMeetingMinute,
  notifyMeetingMinuteTierApprovers,
} = require('../../services/approval-tier.service');

class ProjectMinuteController {
    static async getMinutes(req, res) {
        const { id } = req.params;
        await ProjectService.getById(req.prisma, id, req.user.userId);
        const minutes = await req.prisma.meetingMinute.findMany({ where: { projectId: id }, orderBy: { date: 'desc' } });
        return res.json(minutes);
    }

    static async uploadMinute(req, res) {
        const { id } = req.params;
        await ProjectService.getById(req.prisma, id, req.user.userId);
        const { tenantId, userId } = req.user;
        const file = req.file;
        if (!file) return res.status(400).json({ message: 'Arquivo obrigatório' });

        const uploadsRoot = path.resolve(__dirname, '..', '..', '..');
        const relativePath = path.relative(uploadsRoot, file.path);
        const fileUrl = `/${relativePath.split(path.sep).join('/')}`;

        const minute = await req.prisma.meetingMinute.create({
            data: {
                projectId: id,
                title: req.body.title,
                date: new Date(req.body.date),
                location: req.body.location || null,
                duration: req.body.duration || null,
                participants: req.body.participants,
                topics: req.body.topics ? JSON.parse(req.body.topics) : [],
                actions: req.body.actions ? JSON.parse(req.body.actions) : [],
                fileName: file.originalname,
                fileUrl: fileUrl
            }
        });

        try {
            const project = await req.prisma.project.findUnique({ where: { id } });
            if (project && project.managerId) {
                await NotificationService.createNotification(req.prisma, project.managerId, 'Nova Ata de Reunião',
                    `Uma ata de reunião foi adicionada no projeto ${project.name}.`,
                    'INFO', `/projects/${id}`
                );
            }
        } catch (e) { }

        await req.prisma.auditLog.create({
            data: {
                tenantId, userId,
                action: 'anexou uma ata', module: 'PROJECTS',
                entityId: id, entityType: 'PROJECT',
                newData: { title: minute.title }
            }
        });

        return res.status(201).json(minute);
    }

    static async updateMinute(req, res) {
        const { minuteId } = req.params;
        const file = req.file;
        const existingMinute = await req.prisma.meetingMinute.findUnique({ where: { id: minuteId }, select: { projectId: true } });
        if (!existingMinute) return res.status(404).json({ message: 'Ata nao encontrada.' });
        await ProjectService.getById(req.prisma, existingMinute.projectId, req.user.userId);

        const updateData = {
            title: req.body.title,
            date: new Date(req.body.date),
            location: req.body.location || null,
            duration: req.body.duration || null,
            participants: req.body.participants,
            topics: req.body.topics ? JSON.parse(req.body.topics) : [],
            actions: req.body.actions ? JSON.parse(req.body.actions) : []
        };

        if (file) {
            const uploadsRoot = path.resolve(__dirname, '..', '..', '..');
            const relativePath = path.relative(uploadsRoot, file.path);
            updateData.fileName = file.originalname;
            updateData.fileUrl = `/${relativePath.split(path.sep).join('/')}`;
        }

        const minute = await req.prisma.meetingMinute.update({ where: { id: minuteId }, data: updateData });
        return res.json(minute);
    }

    static async deleteMinute(req, res) {
        const { minuteId } = req.params;
        const minute = await req.prisma.meetingMinute.findUnique({ where: { id: minuteId } });
        if (minute) {
            await ProjectService.getById(req.prisma, minute.projectId, req.user.userId);
            const filePath = path.join(__dirname, '..', '..', '..', minute.fileUrl);
            try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch (e) { logger.error(e); }
            await req.prisma.meetingMinute.delete({ where: { id: minuteId } });
        }
        return res.status(204).send();
    }

    static async submitMinute(req, res) {
        const { id, minuteId } = req.params;
        await ProjectService.getById(req.prisma, id, req.user.userId);

        const minute = await req.prisma.meetingMinute.update({
            where: { id: minuteId },
            data: { status: 'PENDING', rejectionReason: null, requiresAdjustment: false }
        });

        try {
            const project = await req.prisma.project.findUnique({ where: { id } });
            if (project && project.managerId) {
                await NotificationService.createNotification(req.prisma, project.managerId, 'Ata Pendente de Aprovação',
                    `Uma ata "${minute.title}" foi submetida para sua aprovação.`,
                    'INFO', `/projects/${id}`
                );
            }
            await notifyMeetingMinuteTierApprovers(req.prisma, minute, {
                alreadyNotifiedManagerId: project?.managerId,
            });
        } catch (e) { logger.error(e); }

        return res.json(minute);
    }

    static async approveMinute(req, res) {
        const { id, minuteId } = req.params;
        await ProjectService.getById(req.prisma, id, req.user.userId);
        const { userId } = req.user;

        const minuteRow = await req.prisma.meetingMinute.findUnique({ where: { id: minuteId } });
        if (!minuteRow || minuteRow.status !== 'PENDING') {
            return res.status(400).json({ message: 'Ata não está aguardando aprovação' });
        }
        if (!(await userCanApproveMeetingMinute(req.prisma, userId, minuteRow))) {
            return res.status(403).json({ message: 'Sem permissão para aprovar esta ata (gerente do projeto ou alçada).' });
        }

        const minute = await req.prisma.meetingMinute.update({
            where: { id: minuteId },
            data: { status: 'APPROVED', approvedBy: userId, approvedAt: new Date() },
            include: { approver: { select: { name: true } } }
        });

        try {
            await NotificationService.createNotification(req.prisma, userId, 'Ata Aprovada',
                `A ata "${minute.title}" foi aprovada pelo gerente do projeto.`,
                'SUCCESS', `/projects/${id}`
            );
        } catch (e) { logger.error(e); }

        return res.json(minute);
    }

    static async rejectMinute(req, res) {
        const { id, minuteId } = req.params;
        await ProjectService.getById(req.prisma, id, req.user.userId);
        const { userId } = req.user;
        const { reason } = req.body;

        const minuteRow = await req.prisma.meetingMinute.findUnique({ where: { id: minuteId } });
        if (!minuteRow || minuteRow.status !== 'PENDING') {
            return res.status(400).json({ message: 'Ata não está aguardando aprovação' });
        }
        if (!(await userCanApproveMeetingMinute(req.prisma, userId, minuteRow))) {
            return res.status(403).json({ message: 'Sem permissão para rejeitar esta ata (gerente do projeto ou alçada).' });
        }

        const minute = await req.prisma.meetingMinute.update({
            where: { id: minuteId },
            data: { status: 'DRAFT', approvedBy: null, approvedAt: null }
        });

        try {
            await NotificationService.createNotification(req.prisma, userId, 'Ata Rejeitada',
                `A ata "${minute.title}" foi rejeitada. Motivo: ${reason || 'Não informado'}`,
                'WARNING', `/projects/${id}`
            );
        } catch (e) { logger.error(e); }

        return res.json(minute);
    }
}

module.exports = ProjectMinuteController;
