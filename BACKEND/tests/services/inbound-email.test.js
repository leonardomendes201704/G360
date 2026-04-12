const InboundEmailService = require('../../src/services/inbound-email.service');
const { ImapFlow } = require('imapflow');
const simpleParser = require('mailparser').simpleParser;
const TicketService = require('../../src/services/ticket.service');
const logger = require('../../src/config/logger');

jest.mock('imapflow');
jest.mock('mailparser');
jest.mock('../../src/services/ticket.service');
jest.mock('../../src/config/logger', () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
}));

describe('InboundEmailService', () => {
    let mockPrisma;
    
    beforeEach(() => {
        jest.clearAllMocks();
        mockPrisma = {
            integration: { findUnique: jest.fn() },
            ticket: { findUnique: jest.fn() },
            user: { findFirst: jest.fn() }
        };
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('processUnreadEmails', () => {
        it('should abort if IMAP integration is disabled or not found', async () => {
            mockPrisma.integration.findUnique.mockResolvedValue(null);
            await InboundEmailService.processUnreadEmails(mockPrisma);
            expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('IMAP integration disabled'));
        });

        it('should connect to IMAP, fetch unread emails, process, mark as read, and logout', async () => {
            mockPrisma.integration.findUnique.mockResolvedValue({
                isEnabled: true,
                config: { host: 'imap.test', port: 993, user: 'test', pass: 'pass' }
            });

            const mockLock = { release: jest.fn() };
            const mockClient = {
                connect: jest.fn(),
                getMailboxLock: jest.fn().mockResolvedValue(mockLock),
                fetch: async function* () {
                    yield { uid: 1, source: 'raw email' };
                },
                messageFlagsAdd: jest.fn(),
                logout: jest.fn()
            };
            ImapFlow.mockImplementation(() => mockClient);
            simpleParser.mockResolvedValue({ subject: '[HD-2026-0001] Test' });

            jest.spyOn(InboundEmailService, 'processMessage').mockResolvedValue(true);

            await InboundEmailService.processUnreadEmails(mockPrisma);

            expect(mockClient.connect).toHaveBeenCalled();
            expect(mockClient.getMailboxLock).toHaveBeenCalledWith('INBOX');
            expect(InboundEmailService.processMessage).toHaveBeenCalled();
            expect(mockClient.messageFlagsAdd).toHaveBeenCalledWith({ uid: 1 }, ['\\Seen']);
            expect(mockLock.release).toHaveBeenCalled();
            expect(mockClient.logout).toHaveBeenCalled();
        });

        it('should handle general IMAP connection errors gracefully', async () => {
            mockPrisma.integration.findUnique.mockResolvedValue({
                isEnabled: true, config: { host: 'err', user: 'a', pass: 'b' }
            });
            const mockClient = { connect: jest.fn().mockRejectedValue(new Error('IMAP fail')) };
            ImapFlow.mockImplementation(() => mockClient);

            await InboundEmailService.processUnreadEmails(mockPrisma);
            expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Error'), 'IMAP fail');
        });
    });

    describe('processMessage', () => {
        const mockParsedMail = {
            subject: 'Re: Resposta ao chamado [HD-2026-0402]',
            from: { value: [{ address: 'user@example.com' }] },
            text: 'Resposta!\nOn Dec 1 wrote:\nOriginal msg'
        };

        it('should ignore emails without a ticket tag in subject', async () => {
            await InboundEmailService.processMessage(mockPrisma, { subject: 'Spam' });
            expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('não contém código'));
            expect(TicketService.addMessage).not.toHaveBeenCalled();
        });

        it('should ignore if ticket is not found in database', async () => {
            mockPrisma.ticket.findUnique.mockResolvedValue(null);
            await InboundEmailService.processMessage(mockPrisma, mockParsedMail);
            expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('não encontrado no banco'));
            expect(TicketService.addMessage).not.toHaveBeenCalled();
        });

        it('should link to requester if sender is not found in users table', async () => {
            mockPrisma.ticket.findUnique.mockResolvedValue({ id: 't1', code: 'HD-2026-0402', requesterId: 'req1' });
            mockPrisma.user.findFirst.mockResolvedValue(null); // Unknown email

            await InboundEmailService.processMessage(mockPrisma, mockParsedMail);

            expect(TicketService.addMessage).toHaveBeenCalledWith(
                mockPrisma, 't1', 'req1', 'Resposta!', false, []
            );
        });

        it('should identify sender and strip signature correctly', async () => {
            mockPrisma.ticket.findUnique.mockResolvedValue({ id: 't1', code: 'HD-2026-0402' });
            mockPrisma.user.findFirst.mockResolvedValue({ id: 'u1' })

            await InboundEmailService.processMessage(mockPrisma, mockParsedMail);

            expect(TicketService.addMessage).toHaveBeenCalledWith(
                mockPrisma, 't1', 'u1', 'Resposta!', false, []
            );
        });
        
        it('should handle processMessage errors gracefully', async () => {
             mockPrisma.ticket.findUnique.mockRejectedValue(new Error('DB Error'));
             await InboundEmailService.processMessage(mockPrisma, mockParsedMail);
             expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Processing Error:'), 'DB Error');
        });
    });

    describe('extractTicketCodeFromSubject', () => {
        it('should prefer bracketed code', () => {
            expect(InboundEmailService.extractTicketCodeFromSubject('Re: [HD-2026-0001] test')).toBe('HD-2026-0001');
        });
        it('should fallback to bare code', () => {
            expect(InboundEmailService.extractTicketCodeFromSubject('Re: Chamado HD-2026-0999')).toBe('HD-2026-0999');
        });
    });

    describe('stripSignatures', () => {
        it('should strip Gmail quotes', () => {
             const text = 'Hello world\nEm 25 de mar. escreveu:\nQuote';
             expect(InboundEmailService.stripSignatures(text)).toBe('Hello world');
        });

        it('should strip Outlook quotes', () => {
             const text = 'Hello world\n\nDe: Some User\nQuote';
             expect(InboundEmailService.stripSignatures(text)).toBe('Hello world');
        });
        
        it('should return Sem conteudo if text is missing', () => {
             expect(InboundEmailService.stripSignatures(null)).toBe('(Sem conteúdo)');
        });

        it('should return original text if no quotes pattern found', () => {
             const text = 'Just a clean message';
             expect(InboundEmailService.stripSignatures(text)).toBe('Just a clean message');
        });
    });
});
