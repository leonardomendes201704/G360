const nodemailer = require('nodemailer');
const { PrismaClient } = require('@prisma/client');
// const { PrismaClient } = require('@prisma/client');
// const prisma = new PrismaClient();
const logger = require('../config/logger');

class MailService {

    static async getTransporter(prisma) {
        const integration = await prisma.integration.findUnique({
            where: { type: 'SMTP' }
        });

        if (!integration || !integration.isEnabled || !integration.config) {
            return null;
        }

        const { host, port, user, pass, secure } = integration.config;

        return {
            transporter: nodemailer.createTransport({
                host,
                port: parseInt(port),
                secure: secure,
                auth: { user, pass }
            }),
            config: integration.config
        };
    }

    static async sendMail(prisma, { to, subject, html, type, module }) {
        try {
            const setup = await this.getTransporter(prisma);

            if (!setup) {
                logger.info('⚠️ MailService: Integration disabled or not found. Skipping email.');
                return false;
            }

            const { transporter, config } = setup;

            // Check Granular Event
            if (type && config.events && config.events[type] === false) {
                logger.info(`ℹ️ MailService: Event '${type}' is disabled in configuration. Skipping.`);
                return false;
            }

            // Check CC Groups
            let cc = undefined;
            if (module && config.groups && config.groups[module]) {
                cc = config.groups[module];
            }

            const from = `"${config.fromName}" <${config.fromEmail}>`;

            await transporter.sendMail({
                from,
                to,
                cc,
                subject,
                html
            });

            logger.info(`✅ MailService: Email sent to ${to} [${type || 'GENERIC'}]`);
            return true;

        } catch (error) {
            logger.error('❌ MailService Error:', error.message);
            return false;
        }
    }

    static async testConnection(config) {
        try {
            const transporter = nodemailer.createTransport({
                host: config.host,
                port: parseInt(config.port),
                secure: config.secure,
                auth: {
                    user: config.user,
                    pass: config.pass
                }
            });

            await transporter.verify();
            return true;
        } catch (error) {
            throw new Error(`Connection failed: ${error.message}`);
        }
    }
}

module.exports = MailService;
