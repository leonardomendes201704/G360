const IntegrationRepository = require('../repositories/integration.repository');
const LdapService = require('./ldap.service');
const msal = require('@azure/msal-node');
const { Client } = require('@microsoft/microsoft-graph-client');
require('isomorphic-fetch');
const logger = require('../config/logger');

class IntegrationService {
    /**
     * Campos de config seguros para expor em GET /integrations/public (sem segredos).
     */
    static getPublicConfig(type, config) {
        if (!config) return null;
        switch (type) {
            case 'AZURE':
                return {
                    clientId: config.clientId,
                    tenantIdAzure: config.tenantIdAzure,
                    redirectUri: config.redirectUri,
                };
            case 'GOOGLE':
                return {
                    clientId: config.clientId,
                    redirectUri: config.redirectUri,
                };
            default:
                return null;
        }
    }

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

        if (type === 'GOOGLE') {
            return this.testGoogleConnection(integration.config);
        }

        if (type === 'LDAP') {
            return LdapService.testConnection(integration.config);
        }

        return { success: true, message: 'Conexão simulada OK' };
    }

    /**
     * Valida Client ID/Secret com o endpoint de token do Google (código inválido de propósito).
     */
    static async testGoogleConnection(config) {
        const { clientId, clientSecret, redirectUri } = config || {};

        if (!clientId || !clientSecret || !redirectUri) {
            throw new Error('Configuração incompleta (Client ID, Client Secret e Redirect URI são obrigatórios).');
        }

        const params = new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            code: '__invalid_test_code__',
            grant_type: 'authorization_code',
            redirect_uri: redirectUri,
        });

        const res = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params.toString(),
        });

        const data = await res.json().catch(() => ({}));

        if (data.error === 'invalid_client') {
            throw new Error('Client ID ou Client Secret inválidos.');
        }

        if (data.error === 'invalid_grant') {
            return {
                success: true,
                message: 'Credenciais aceites pelo Google (troca de código de teste rejeitada, como esperado).',
            };
        }

        if (data.error === 'redirect_uri_mismatch') {
            throw new Error('Redirect URI não coincide com o registado na Google Cloud Console.');
        }

        throw new Error(data.error_description || data.error || 'Resposta inesperada do Google OAuth.');
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
