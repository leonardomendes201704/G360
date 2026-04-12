const MailService = require('../../src/services/mail.service');
const { PrismaClient } = require('@prisma/client');
const nodemailer = require('nodemailer');

jest.mock('@prisma/client', () => {
    const mockPrisma = {
        integration: {
            findUnique: jest.fn()
        }
    };
    return { PrismaClient: jest.fn(() => mockPrisma) };
});

jest.mock('nodemailer');

describe('MailService', () => {
    let prisma;
    let mockTransporter;

    beforeEach(() => {
        prisma = new PrismaClient();
        mockTransporter = {
            sendMail: jest.fn().mockResolvedValue({ messageId: '123' }),
            verify: jest.fn().mockResolvedValue(true)
        };
        nodemailer.createTransport.mockReturnValue(mockTransporter);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('getTransporter', () => {
        it('should return null if integration not found or disabled', async () => {
            prisma.integration.findUnique.mockResolvedValue(null);
            const result = await MailService.getTransporter(prisma);
            expect(result).toBeNull();
        });

        it('should return transporter and config if integration is enabled', async () => {
            const mockConfig = {
                host: 'smtp.test.com',
                port: '587',
                user: 'user',
                pass: 'pass',
                secure: false,
                fromName: 'G360',
                fromEmail: 'no-reply@g360.com'
            };
            prisma.integration.findUnique.mockResolvedValue({
                isEnabled: true,
                config: mockConfig
            });

            const result = await MailService.getTransporter(prisma);

            expect(result).not.toBeNull();
            expect(result.config).toEqual(mockConfig);
            expect(nodemailer.createTransport).toHaveBeenCalledWith(expect.objectContaining({
                host: 'smtp.test.com',
                port: 587
            }));
        });
    });

    describe('sendMail', () => {
        it('should return false if transporter setup fails', async () => {
            jest.spyOn(MailService, 'getTransporter').mockResolvedValue(null);
            const result = await MailService.sendMail(prisma, { to: 'test@test.com' });
            expect(result).toBe(false);
        });

        it('should skip email if specific event type is disabled in config', async () => {
            jest.spyOn(MailService, 'getTransporter').mockResolvedValue({
                transporter: mockTransporter,
                config: {
                    events: { 'TASK_CREATED': false }
                }
            });

            const result = await MailService.sendMail(prisma, {
                to: 'test@test.com',
                type: 'TASK_CREATED'
            });

            expect(result).toBe(false);
            expect(mockTransporter.sendMail).not.toHaveBeenCalled();
        });

        it('should send email successfully with correct params', async () => {
            jest.spyOn(MailService, 'getTransporter').mockResolvedValue({
                transporter: mockTransporter,
                config: {
                    fromName: 'System',
                    fromEmail: 'sys@g360.com',
                    groups: { 'FINANCE': 'finance@g360.com' } // CC Logic
                }
            });

            const result = await MailService.sendMail(prisma, {
                to: 'user@g360.com',
                subject: 'Hello',
                html: '<p>Hi</p>',
                module: 'FINANCE' // Triggers CC
            });

            expect(result).toBe(true);
            expect(mockTransporter.sendMail).toHaveBeenCalledWith({
                from: '"System" <sys@g360.com>',
                to: 'user@g360.com',
                cc: 'finance@g360.com',
                subject: 'Hello',
                html: '<p>Hi</p>'
            });
        });

        it('should handle transporter errors gracefully', async () => {
            jest.spyOn(MailService, 'getTransporter').mockResolvedValue({
                transporter: mockTransporter,
                config: { fromName: 'X', fromEmail: 'x@x.com' }
            });
            mockTransporter.sendMail.mockRejectedValue(new Error('SMTP Error'));

            const result = await MailService.sendMail(prisma, { to: 'fail@test.com' });

            expect(result).toBe(false);
        });
    });

    describe('testConnection', () => {
        it('should return true on successful verification', async () => {
            const result = await MailService.testConnection({ host: 'smtp' });
            expect(result).toBe(true);
            expect(mockTransporter.verify).toHaveBeenCalled();
        });

        it('should throw error on verification failure', async () => {
            mockTransporter.verify.mockRejectedValue(new Error('Auth failed'));
            await expect(MailService.testConnection({ host: 'smtp' }))
                .rejects.toThrow(/Connection failed: Auth failed/);
        });
    });
});
