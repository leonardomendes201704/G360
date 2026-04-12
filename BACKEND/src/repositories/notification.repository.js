class NotificationRepository {
    static async create(prisma, data) {
        return prisma.notification.create({
            data
        });
    }

    /**
     * Evita spam: se já existe notificação não lida com a mesma dedupeKey, não criar outra.
     */
    static async findUnreadByDedupeKey(prisma, userId, dedupeKey) {
        if (!dedupeKey) return null;
        return prisma.notification.findFirst({
            where: {
                userId,
                dedupeKey,
                isRead: false
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    static async findByUserId(prisma, userId, limit = 20) {
        return prisma.notification.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: limit
        });
    }

    static async countUnread(prisma, userId) {
        return prisma.notification.count({
            where: {
                userId,
                isRead: false
            }
        });
    }

    static async markAsRead(prisma, id) {
        return prisma.notification.update({
            where: { id },
            data: { isRead: true }
        });
    }

    static async markAllAsRead(prisma, userId) {
        return prisma.notification.updateMany({
            where: {
                userId,
                isRead: false
            },
            data: { isRead: true }
        });
    }
}

module.exports = NotificationRepository;
