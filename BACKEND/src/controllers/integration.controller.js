const IntegrationService = require('../services/integration.service');

class IntegrationController {
    static async index(req, res) {
        try {
            const integrations = await IntegrationService.getAll(req.prisma);
            return res.json(integrations);
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    static async update(req, res) {
        try {
            const { type } = req.params;
            const data = req.body;
            const integration = await IntegrationService.update(req.prisma, type, data);
            return res.json(integration);
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }

    static async test(req, res) {
        try {
            const { type } = req.params;

            if (type === 'SMTP') {
                const MailService = require('../services/mail.service');
                await MailService.testConnection(req.prisma, req.body);
                return res.json({ success: true, message: 'Conexão SMTP estabelecida com sucesso!' });
            }

            const result = await IntegrationService.testConnection(req.prisma, type);
            return res.json(result);
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }
    static async getActive(req, res) {
        try {
            const integrations = await IntegrationService.getAll(req.prisma);
            const active = integrations
                .filter(i => i.isEnabled)
                .map(i => ({
                    type: i.type,
                    name: i.name,
                    isEnabled: i.isEnabled,
                    config: i.config ? {
                        clientId: i.config.clientId,
                        tenantIdAzure: i.config.tenantIdAzure,
                        redirectUri: i.config.redirectUri
                    } : null
                }));
            return res.json(active);
        } catch (error) {
            return res.status(500).json({ error: error.message });
        }
    }
}

module.exports = IntegrationController;
