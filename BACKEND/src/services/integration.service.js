const IntegrationRepository = require('../repositories/integration.repository');
const LdapService = require('./ldap.service');
const msal = require('@azure/msal-node');
const { Client } = require('@microsoft/microsoft-graph-client');
require('isomorphic-fetch');
const logger = require('../config/logger');

class IntegrationService {
    static async getAll(prisma) {
        return IntegrationRepository.findAll(prisma);
    }

    static async update(prisma, type, data) {
        // Aqui poderia ter validação do config baseada no tipo
        return IntegrationRepository.update(prisma, type, data);
    }

    static async getByType(prisma, type) {
        return IntegrationRepository.findByType(prisma, type);
    }

    static async testConnection(prisma, type) {
        const integration = await IntegrationRepository.findByType(prisma, type);
        if (!integration || !integration.isEnabled || !integration.config) {
            throw new Error('Integração não configurada ou inativa.');
        }

        if (type === 'AZURE') {
            return this.testAzureConnection(integration.config);
        }

        if (type === 'LDAP') {
            return LdapService.testConnection(integration.config);
        }

        return { success: true, message: 'Conexão simulada OK' };
    }

    static async testAzureConnection(prisma, config) {
        try {
            const { clientId, clientSecret, tenantIdAzure } = config;

            if (!clientId || !clientSecret || !tenantIdAzure) {
                throw new Error('Configuração incompleta.');
            }

            const msalConfig = {
                auth: {
                    clientId,
                    authority: `https://login.microsoftonline.com/${tenantIdAzure}`,
                    clientSecret,
                }
            };

            const cca = new msal.ConfidentialClientApplication(msalConfig);
            const authResponse = await cca.acquireTokenByClientCredential({
                scopes: ['https://graph.microsoft.com/.default'],
            });

            if (!authResponse || !authResponse.accessToken) {
                throw new Error('Falha na autenticação com Azure.');
            }

            const client = Client.init({
                authProvider: (done) => {
                    done(null, authResponse.accessToken);
                }
            });

            let allUsers = [];
            let response = await client.api('/users')
                .select('id,displayName,userPrincipalName')
                .top(999)
                .get();

            allUsers = allUsers.concat(response.value);

            while (response['@odata.nextLink']) {
                response = await client.api(response['@odata.nextLink']).get();
                allUsers = allUsers.concat(response.value);
            }

            return {
                success: true,
                message: `Conexão estabelecida com sucesso! ${allUsers.length} usuários encontrados.`,
                users: allUsers
            };

        } catch (error) {
            logger.error('Azure Connection Error:', error);
            throw new Error(`Erro na conexão com Azure: ${error.message}`);
        }
    }
}

module.exports = IntegrationService;
