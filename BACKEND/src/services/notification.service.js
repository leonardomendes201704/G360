const NotificationRepository = require('../repositories/notification.repository');
const MailService = require('./mail.service');
const logger = require('../config/logger');
const sseHub = require('../utils/notification-sse-hub');
const {
    mergeNotificationPrefs,
    isCategoryEnabled,
    shouldSendInApp,
    shouldSendEmailChannel,
    emailChannelForCategory,
    isQuietHoursNow
} = require('../utils/notification-prefs.util');

/**
 * @typedef {object} CreateNotificationOpts
 * @property {string} userId
 * @property {string} title
 * @property {string} message
 * @property {string} [type]
 * @property {string|null} [link]
 * @property {string|null} [eventCode]
 * @property {string|null} [entityType]
 * @property {string|null} [entityId]
 * @property {string|null} [dedupeKey]
 * @property {string} [category] — SLA | APPROVALS | HELPDESK | GMUD | PROJECTS | INCIDENTS | FINANCE | DEFAULT
 * @property {string} [tenantSlug] — para SSE multi-tenant
 * @property {boolean} [skipDedupe]
 * @property {{ to: string, subject: string, html: string, type?: string, module?: string }|null} [mail]
 */

class NotificationService {
    /**
     * Compatível com assinatura antiga: (prisma, userId, title, message, type, link)
     * Ou object: (prisma, CreateNotificationOpts)
     */
    static async createNotification(prisma, b, c, d, e, f) {
        /** @type {CreateNotificationOpts} */
        let opts;
        if (b && typeof b === 'object' && 'userId' in b && typeof b.userId === 'string' && 'title' in b) {
            opts = b;
        } else {
            opts = {
                userId: b,
                title: c,
                message: d,
                type: e || 'INFO',
                link: f != null ? f : null
            };
        }

        const {
            userId,
            title,
            message,
            type = 'INFO',
            link = null,
            eventCode = null,
            entityType = null,
            entityId = null,
            dedupeKey = null,
            category = 'DEFAULT',
            tenantSlug = null,
            skipDedupe = false,
            mail = null
        } = opts;

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, email: true, notificationPreferences: true }
        });

        if (!user) {
            logger.warn(`[Notification] utilizador ${userId} não encontrado`);
            return null;
        }

        const prefs = mergeNotificationPrefs(user.notificationPreferences);

        if (!isCategoryEnabled(prefs, category)) {
            logger.info(`[Notification] categoria desactivada para ${userId} (${category}) event=${eventCode || '—'}`);
            return null;
        }

        let created = null;

        if (shouldSendInApp(prefs)) {
            if (dedupeKey && !skipDedupe) {
                const dup = await NotificationRepository.findUnreadByDedupeKey(prisma, userId, dedupeKey);
                if (dup) {
                    logger.info(`[Notification] dedupe skip user=${userId} key=${dedupeKey}`);
                    return dup;
                }
            }

            created = await NotificationRepository.create(prisma, {
                userId,
                title,
                message,
                type,
                link,
                eventCode,
                entityType,
                entityId,
                dedupeKey
            });

            logger.info(
                `[Notification] in-app user=${userId} event=${eventCode || '—'} entity=${entityType || ''}:${entityId || ''}`
            );

            if (tenantSlug && created) {
                sseHub.emit(tenantSlug, userId, {
                    type: 'notification',
                    id: created.id,
                    unreadDelta: 1
                });
            }
        }

        if (mail && mail.to && mail.html) {
            const ch = emailChannelForCategory(category);
            if (
                shouldSendEmailChannel(prefs, ch) &&
                !isQuietHoursNow(prefs)
            ) {
                await MailService.sendMail(prisma, {
                    to: mail.to,
                    subject: mail.subject,
                    html: mail.html,
                    type: mail.type,
                    module: mail.module
                });
            }
        }

        return created;
    }

    static async getUserNotifications(prisma, userId) {
        const notifications = await NotificationRepository.findByUserId(prisma, userId);
        const unreadCount = await NotificationRepository.countUnread(prisma, userId);
        return { notifications, unreadCount };
    }

    static async markAsRead(prisma, id) {
        return NotificationRepository.markAsRead(prisma, id);
    }

    static async markAllAsRead(prisma, userId) {
        return NotificationRepository.markAllAsRead(prisma, userId);
    }
}

module.exports = NotificationService;
