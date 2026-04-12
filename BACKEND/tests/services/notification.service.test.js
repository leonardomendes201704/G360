const NotificationService = require('../../src/services/notification.service');
const NotificationRepository = require('../../src/repositories/notification.repository');

jest.mock('../../src/repositories/notification.repository');
jest.mock('../../src/services/mail.service', () => ({ sendMail: jest.fn().mockResolvedValue(true) }));
jest.mock('../../src/utils/notification-sse-hub', () => ({ emit: jest.fn() }));

const prisma = {
    user: {
        findUnique: jest.fn().mockResolvedValue({
            id: 'u1',
            email: 'u@test.com',
            notificationPreferences: null
        })
    }
};

describe('NotificationService', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('createNotification', () => {
        it('should create a notification with default type INFO', async () => {
            const mockNotification = { id: 1, type: 'INFO', userId: 1, title: 'Test', message: 'Hello' };
            NotificationRepository.findUnreadByDedupeKey = jest.fn().mockResolvedValue(null);
            NotificationRepository.create.mockResolvedValue(mockNotification);

            const result = await NotificationService.createNotification(prisma, 1, 'Test', 'Hello');

            expect(NotificationRepository.create).toHaveBeenCalledWith(
                prisma,
                {
                    userId: 1,
                    title: 'Test',
                    message: 'Hello',
                    type: 'INFO',
                    link: null,
                    eventCode: null,
                    entityType: null,
                    entityId: null,
                    dedupeKey: null
                }
            );
            expect(result).toEqual(mockNotification);
        });

        it('should create a notification with custom type and link', async () => {
            const mockNotification = { id: 2, type: 'WARNING', userId: 1, title: 'Alert', message: 'Run', link: '/run' };
            NotificationRepository.findUnreadByDedupeKey = jest.fn().mockResolvedValue(null);
            NotificationRepository.create.mockResolvedValue(mockNotification);

            const result = await NotificationService.createNotification(prisma, 1, 'Alert', 'Run', 'WARNING', '/run');

            expect(NotificationRepository.create).toHaveBeenCalledWith(
                prisma,
                {
                    userId: 1,
                    title: 'Alert',
                    message: 'Run',
                    type: 'WARNING',
                    link: '/run',
                    eventCode: null,
                    entityType: null,
                    entityId: null,
                    dedupeKey: null
                }
            );
            expect(result).toEqual(mockNotification);
        });
    });

    describe('getUserNotifications', () => {
        it('should return notifications and unread count', async () => {
            const mockNotifications = [{ id: 1, title: 'N1' }];
            const mockCount = 5;

            NotificationRepository.findByUserId.mockResolvedValue(mockNotifications);
            NotificationRepository.countUnread.mockResolvedValue(mockCount);

            const result = await NotificationService.getUserNotifications(prisma, 100);
            expect(NotificationRepository.findByUserId).toHaveBeenCalledWith(prisma, 100);
            expect(NotificationRepository.countUnread).toHaveBeenCalledWith(prisma, 100);
            expect(result).toEqual({
                notifications: mockNotifications,
                unreadCount: mockCount
            });
        });
    });

    describe('markAsRead', () => {
        it('should call repository to mark as read', async () => {
            NotificationRepository.markAsRead.mockResolvedValue({ id: 1, isRead: true });

            const result = await NotificationService.markAsRead(prisma, 1);
            expect(NotificationRepository.markAsRead).toHaveBeenCalledWith(prisma, 1);
            expect(result).toEqual({ id: 1, isRead: true });
        });
    });

    describe('markAllAsRead', () => {
        it('should call repository to mark all as read for user', async () => {
            NotificationRepository.markAllAsRead.mockResolvedValue({ count: 5 });

            const result = await NotificationService.markAllAsRead(prisma, 100);
            expect(NotificationRepository.markAllAsRead).toHaveBeenCalledWith(prisma, 100);
            expect(result).toEqual({ count: 5 });
        });
    });
});
