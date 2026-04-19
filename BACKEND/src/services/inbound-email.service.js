const { ImapFlow } = require('imapflow');
const simpleParser = require('mailparser').simpleParser;
const logger = require('../config/logger');
const TicketService = require('./ticket.service');

class InboundEmailService {
    static async processUnreadEmails(prismaClient) {
        // Fetch IMAP integration config
        const integration = await prismaClient.integration.findUnique({
            where: { type: 'IMAP' }
        });

        if (!integration || !integration.isEnabled || !integration.config) {
            logger.info('⚠️ InboundEmailService: IMAP integration disabled or not found.');
            return;
        }

        const { host, port, user, pass, secure } = integration.config;

        const client = new ImapFlow({
            host,
            port: parseInt(port) || 993,
            secure: secure !== undefined ? secure : true,
            auth: { user, pass },
            logger: false
        });

        try {
            await client.connect();
            logger.info('✅ InboundEmailService: IMAP Connected.');

            // Select Inbox
            const lock = await client.getMailboxLock('INBOX');
            try {
                // Fetch unread messages
                for await (const message of client.fetch({ unseen: true }, { source: true })) {
                    const parsed = await simpleParser(message.source);
                    await this.processMessage(prismaClient, parsed);

                    // Mark as read
                    await client.messageFlagsAdd({ uid: message.uid }, ['\\Seen']);
                }
            } finally {
                lock.release();
            }
            await client.logout();
        } catch (error) {
            logger.error('❌ InboundEmailService Error:', error.message);
        }
    }

    /**
     * Preferência: [HDyynnnn] no assunto (formato actual, sem hífens).
     * Legado: [HD-AAAA-NNNN] (respostas a e-mails antigos).
     */
    static extractTicketCodeFromSubject(subject) {
        if (!subject || typeof subject !== 'string') return null;
        const bracketNew = subject.match(/\[(HD\d{6})\]/);
        if (bracketNew) return bracketNew[1];
        const looseNew = subject.match(/\b(HD\d{6})\b/);
        if (looseNew) return looseNew[1];
        const bracket = subject.match(/\[(HD-\d{4}-\d+)\]/);
        if (bracket) return bracket[1];
        const loose = subject.match(/\b(HD-\d{4}-\d+)\b/);
        return loose ? loose[1] : null;
    }

    static async processMessage(prismaClient, parsedMail) {
        try {
            const subject = parsedMail.subject || '';

            const ticketCode = this.extractTicketCodeFromSubject(subject);
            if (!ticketCode) {
                logger.info('InboundEmail: Ignorado. Assunto não contém código de chamado (HDyynnnn ou legado HD-AAAA-NNNN).');
                return;
            }
            
            // Encontrar Chamado no BD
            const ticket = await prismaClient.ticket.findUnique({
                where: { code: ticketCode }
            });

            if (!ticket) {
                logger.warn(`InboundEmail: Chamado ${ticketCode} não encontrado no banco.`);
                return;
            }

            const fromAddr = parsedMail.from?.value?.[0];
            const fromEmail = (fromAddr && fromAddr.address) ? String(fromAddr.address).trim() : '';
            if (!fromEmail) {
                logger.warn('InboundEmail: e-mail sem remetente válido.');
                return;
            }

            const user = await prismaClient.user.findFirst({
                where: { email: { equals: fromEmail, mode: 'insensitive' } }
            });

            const userId = user ? user.id : ticket.requesterId;

            const rawText = parsedMail.text && String(parsedMail.text).trim()
                ? parsedMail.text
                : this.htmlToPlain(parsedMail.html);
            const cleanText = this.stripSignatures(rawText || '');

            // Anexos do e-mail
            const attachments = []; 
            // Implementação de attachments do mailparser omitida para manter a simplicidade neste MVP, 
            // precisaria salvar arquivos no FS/S3 e pegar URLs.
            
            await TicketService.addMessage(
                prismaClient, 
                ticket.id, 
                userId, 
                cleanText, 
                false, // Respostas do cliente pro email sempre vão para o Public feed! Notas internas são do painel.
                attachments
            );

            logger.info(`✅ InboundEmail: Resposta anexada ao chamado ${ticketCode}.`);

        } catch (err) {
            logger.error('❌ InboundEmail Processing Error:', err.message);
        }
    }

    static htmlToPlain(html) {
        if (!html || typeof html !== 'string') return '';
        return html
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<\/(p|div|tr|h[1-6])>/gi, '\n')
            .replace(/<[^>]+>/g, ' ')
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/\s+\n/g, '\n')
            .replace(/\s{2,}/g, ' ')
            .trim();
    }

    static stripSignatures(text) {
        if (!text) return '(Sem conteúdo)';
        
        // Remove delimitadores de resposta comuns do Outlook/Gmail
        const replySplits = [
            /\n_+.*\n/g, // Gmail separator
            /\nEm .* escreveu:/gi, // Gmail PT
            /\nOn .* wrote:/gi, // Gmail EN
            /\nDe: .*/gi, // Outlook PT
            /\nFrom: .*/gi, // Outlook EN
            /\n\-+.*original message.*\-+/gi
        ];

        let cleanText = text;
        for (const regex of replySplits) {
            const index = cleanText.search(regex);
            if (index !== -1) {
                cleanText = cleanText.substring(0, index);
            }
        }
        
        return cleanText.trim();
    }
}

module.exports = InboundEmailService;
