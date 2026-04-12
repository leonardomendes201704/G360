const { getUserAccessScope } = require('../utils/access-scope');
const { userMatchesPermission } = require('../utils/permission-check');
const sseHub = require('../utils/notification-sse-hub');

class NotificationController {
    /**
     * Server-Sent Events: o cliente recebe eventos quando há novas notificações (push leve).
     */
    static stream(req, res) {
        const userId = req.user.userId;
        const slug = req.tenantInfo?.slug || 'default';

        res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache, no-transform');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');
        if (typeof res.flushHeaders === 'function') {
            res.flushHeaders();
        }

        sseHub.register(slug, userId, res);

        const ping = setInterval(() => {
            try {
                res.write(': ping\n\n');
            } catch (_) {
                clearInterval(ping);
            }
        }, 30000);

        res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);

        req.on('close', () => {
            clearInterval(ping);
            sseHub.unregister(slug, userId, res);
        });
    }

    static async list(req, res) {
        try {
            const { userId } = req.user;
            const { page = 1, limit = 50, all = false } = req.query;

            const where = { userId };

            const user = await req.prisma.user.findUnique({
                where: { id: userId },
                include: { roles: { include: { permissions: true } } }
            });

            const scope = await getUserAccessScope(req.prisma, userId);
            const hasPermission = (module, action = 'READ') => userMatchesPermission(user, module, action);

            const moduleForLink = (link) => {
                if (!link || typeof link !== 'string') return null;
                const normalized = link.toLowerCase();
                const mappings = [
                    { prefix: '/servicedesk/problems', module: 'PROBLEM' },
                    { prefix: '/servicedesk', module: 'HELPDESK' },
                    { prefix: '/portal', module: 'HELPDESK' },
                    { prefix: '/projects', module: 'PROJECTS' },
                    { prefix: '/tasks', module: 'TASKS' },
                    { prefix: '/finance', module: 'FINANCE' },
                    { prefix: '/approvals', module: 'APPROVALS' },
                    { prefix: '/changes', module: 'GMUD' },
                    { prefix: '/incidents', module: 'INCIDENT' },
                    { prefix: '/contracts', module: 'CONTRACTS' },
                    { prefix: '/suppliers', module: 'SUPPLIERS' },
                    { prefix: '/assets', module: 'ASSETS' },
                    { prefix: '/risks', module: 'RISKS' },
                    { prefix: '/activities', module: 'ACTIVITY_LOG' },
                    { prefix: '/admin', module: 'ACTIVITY_LOG' },
                    { prefix: '/config', module: 'CONFIG' },
                    { prefix: '/knowledge', module: 'KB' },
                ];
                const match = mappings.find((m) => normalized.startsWith(m.prefix));
                return match ? match.module : null;
            };

            const canAccessLink = async (notif) => {
                const module = moduleForLink(notif.link);
                if (module && !hasPermission(module, 'READ')) return false;
                if (scope.isAdmin) return true;
                if (!notif.link || typeof notif.link !== 'string') return true;

                const clean = notif.link.split('?')[0];
                const parts = clean.split('/').filter(Boolean);
                if (parts.length < 2) return true;

                const [resource, id] = parts;
                if (!id) return true;

                if (resource === 'assets') {
                    const asset = await req.prisma.asset.findUnique({ where: { id }, select: { costCenterId: true } });
                    return asset && scope.accessibleCostCenterIds.includes(asset.costCenterId);
                }

                if (resource === 'contracts') {
                    const contract = await req.prisma.contract.findUnique({ where: { id }, select: { costCenterId: true } });
                    return contract && scope.accessibleCostCenterIds.includes(contract.costCenterId);
                }

                if (resource === 'incidents') {
                    const incident = await req.prisma.incident.findUnique({
                        where: { id },
                        select: {
                            reporterId: true,
                            assigneeId: true,
                            reporter: { select: { costCenterId: true } },
                            assignee: { select: { costCenterId: true } }
                        }
                    });
                    if (!incident) return false;
                    const ccIds = scope.accessibleCostCenterIds || [];
                    const allowedByCc = ccIds.length > 0 && (
                        (incident.reporter?.costCenterId && ccIds.includes(incident.reporter.costCenterId)) ||
                        (incident.assignee?.costCenterId && ccIds.includes(incident.assignee.costCenterId))
                    );
                    const allowedByUser = incident.reporterId === userId || incident.assigneeId === userId;
                    return allowedByCc || allowedByUser;
                }

                return true;
            };

            // If 'all' is not true, maybe we want to filter? 
            // Requirement says "concentrating all real notifications". 
            // Standard list usually returns everything sorted by date.

            const notificationsRaw = await req.prisma.notification.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                take: all ? undefined : Number(limit),
                skip: all ? undefined : (Number(page) - 1) * Number(limit)
            });

            const notifications = (await Promise.all(
                notificationsRaw.map(async (notif) => ({ notif, allowed: await canAccessLink(notif) }))
            ))
                .filter(item => item.allowed)
                .map(item => item.notif);

            const unreadRaw = await req.prisma.notification.findMany({
                where: { userId, isRead: false },
                select: { id: true, link: true }
            });

            const unreadCount = (await Promise.all(
                unreadRaw.map(async (notif) => ({ notif, allowed: await canAccessLink(notif) }))
            ))
                .filter(item => item.allowed)
                .length;

            return res.json({
                notifications,
                unreadCount
            });

        } catch (error) {
            return res.status(500).json({ error: 'Erro ao buscar notificações', details: error.message });
        }
    }

    static async markAsRead(req, res) {
        try {
            const { id } = req.params;
            const { userId } = req.user;

            await req.prisma.notification.updateMany({
                where: { id, userId },
                data: { isRead: true }
            });

            return res.status(204).send();
        } catch (error) {
            return res.status(500).json({ error: 'Erro ao atualizar notificação' });
        }
    }

    static async markAllAsRead(req, res) {
        try {
            const { userId } = req.user;

            await req.prisma.notification.updateMany({
                where: { userId, isRead: false },
                data: { isRead: true }
            });

            return res.status(204).send();
        } catch (error) {
            return res.status(500).json({ error: 'Erro ao atualizar notificações' });
        }
    }
}

module.exports = NotificationController;
