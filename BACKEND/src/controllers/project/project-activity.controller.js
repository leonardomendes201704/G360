const ProjectService = require('../../services/project.service');

class ProjectActivityController {
    static async getActivities(req, res) {
        const { id } = req.params;
        await ProjectService.getById(req.prisma, id, req.user.userId);

        const activities = await req.prisma.auditLog.findMany({
            where: {
                OR: [{ entityType: 'PROJECT', entityId: id }]
            },
            include: {
                user: { select: { name: true, avatar: true } }
            },
            orderBy: { createdAt: 'desc' },
            take: 10
        });

        return res.json(activities);
    }
}

module.exports = ProjectActivityController;
