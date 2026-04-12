const NotificationService = require('../../services/notification.service');
const ProjectService = require('../../services/project.service');
const logger = require('../../config/logger');

class ProjectFollowUpController {
    static async getFollowUps(req, res) {
        const { id } = req.params;
        await ProjectService.getById(req.prisma, id, req.user.userId);
        const followUps = await req.prisma.projectFollowUp.findMany({
            where: { projectId: id },
            include: {
                author: { select: { id: true, name: true, avatar: true } },
                assignee: { select: { id: true, name: true, avatar: true } }
            },
            orderBy: { dueDate: 'asc' }
        });
        return res.json(followUps);
    }

    static async createFollowUp(req, res) {
        const { id } = req.params;
        await ProjectService.getById(req.prisma, id, req.user.userId);
        const { userId, tenantId } = req.user;
        const { title, description, type, priority, dueDate, assigneeId, meetingLink, highlights, risks, nextSteps, status } = req.body;

        const followUp = await req.prisma.projectFollowUp.create({
            data: {
                projectId: id, authorId: userId,
                title: title || '', description: description || null,
                type: type || 'TASK', priority: priority || 'MEDIUM',
                dueDate: dueDate ? new Date(dueDate) : new Date(),
                assigneeId: assigneeId || null,
                meetingLink: meetingLink || null,
                date: new Date(), status: status || 'PENDING',
                highlights: highlights || '',
                risks: risks || null, nextSteps: nextSteps || null
            },
            include: {
                author: { select: { id: true, name: true, avatar: true } },
                assignee: { select: { id: true, name: true, avatar: true } }
            }
        });

        await req.prisma.auditLog.create({
            data: {
                tenantId, userId,
                action: 'registrou follow-up', module: 'PROJECTS',
                entityId: id, entityType: 'PROJECT',
                newData: { title: followUp.title, type: followUp.type }
            }
        });

        if (assigneeId && assigneeId !== userId) {
            try {
                const project = await req.prisma.project.findUnique({ where: { id } });
                await NotificationService.createNotification(req.prisma, assigneeId, 'Novo Follow-up Atribuído',
                    `Você foi designado para um follow-up: "${title}" no projeto ${project?.name || 'N/A'}`,
                    'INFO', `/projects/${id}`
                );
            } catch (e) { logger.error(e); }
        }

        return res.status(201).json(followUp);
    }

    static async updateFollowUp(req, res) {
        const { followUpId } = req.params;
        const { title, description, type, priority, dueDate, assigneeId, meetingLink, highlights, risks, nextSteps, status } = req.body;
        const updateData = {};
        if (title !== undefined) updateData.title = title;
        if (description !== undefined) updateData.description = description;
        if (type !== undefined) updateData.type = type;
        if (priority !== undefined) updateData.priority = priority;
        if (dueDate !== undefined) updateData.dueDate = new Date(dueDate);
        if (assigneeId !== undefined) updateData.assigneeId = assigneeId || null;
        if (meetingLink !== undefined) updateData.meetingLink = meetingLink;
        if (highlights !== undefined) updateData.highlights = highlights;
        if (risks !== undefined) updateData.risks = risks;
        if (nextSteps !== undefined) updateData.nextSteps = nextSteps;
        if (status !== undefined) updateData.status = status;

        const followUp = await req.prisma.projectFollowUp.update({
            where: { id: followUpId }, data: updateData,
            include: {
                author: { select: { id: true, name: true, avatar: true } },
                assignee: { select: { id: true, name: true, avatar: true } }
            }
        });
        return res.json(followUp);
    }

    static async deleteFollowUp(req, res) {
        const { followUpId } = req.params;
        await req.prisma.projectFollowUp.delete({ where: { id: followUpId } });
        return res.status(204).send();
    }

    static async completeFollowUp(req, res) {
        const followUp = await req.prisma.projectFollowUp.update({
            where: { id: req.params.followUpId },
            data: { status: 'COMPLETED', completedAt: new Date() },
            include: {
                author: { select: { id: true, name: true, avatar: true } },
                assignee: { select: { id: true, name: true, avatar: true } }
            }
        });
        return res.json(followUp);
    }

    static async rescheduleFollowUp(req, res) {
        const { newDate } = req.body;
        if (!newDate) return res.status(400).json({ message: 'Nova data é obrigatória' });

        const followUp = await req.prisma.projectFollowUp.update({
            where: { id: req.params.followUpId },
            data: { dueDate: new Date(newDate), status: 'PENDING' },
            include: {
                author: { select: { id: true, name: true, avatar: true } },
                assignee: { select: { id: true, name: true, avatar: true } }
            }
        });
        return res.json(followUp);
    }
}

module.exports = ProjectFollowUpController;
