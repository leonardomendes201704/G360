const IntegrationService = require('../../src/services/integration.service');
const IntegrationRepository = require('../../src/repositories/integration.repository');
const LdapService = require('../../src/services/ldap.service');
const msal = require('@azure/msal-node');
const { Client } = require('@microsoft/microsoft-graph-client');

jest.mock('../../src/repositories/integration.repository');
jest.mock('../../src/services/ldap.service');
jest.mock('@azure/msal-node');
jest.mock('@microsoft/microsoft-graph-client');
jest.mock('../../src/config/logger', () => ({
    info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn()
}));

const mockPrisma = {};

describe('IntegrationService', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('CRUD wrappers', () => {
        it('getAll should call repository', async () => {
            IntegrationRepository.findAll.mockResolvedValue(['t1']);
            const res = await IntegrationService.getAll(mockPrisma);
            expect(res).toEqual(['t1']);
            expect(IntegrationRepository.findAll).toHaveBeenCalledWith(mockPrisma);
        });

        it('update should call repository', async () => {
            IntegrationRepository.update.mockResolvedValue('t2');
            const res = await IntegrationService.update(mockPrisma, 'T', {a:1});
            expect(res).toBe('t2');
            expect(IntegrationRepository.update).toHaveBeenCalledWith(mockPrisma, 'T', {a:1});
        });

        it('getByType should call repository', async () => {
            IntegrationRepository.findByType.mockResolvedValue('t3');
            const res = await IntegrationService.getByType(mockPrisma, 'T');
            expect(res).toBe('t3');
        });
    });

    describe('testConnection', () => {
        it('should call LdapService for LDAP type', async () => {
            IntegrationRepository.findByType.mockResolvedValue({
                isEnabled: true, config: { host: 'ldap://localhost' }
            });
            LdapService.testConnection.mockResolvedValue({ success: true });

            await IntegrationService.testConnection(mockPrisma, 'LDAP');
            expect(LdapService.testConnection).toHaveBeenCalledWith({ host: 'ldap://localhost' });
        });

        it('should throw if integration inactive', async () => {
            IntegrationRepository.findByType.mockResolvedValue({ isEnabled: false });
            await expect(IntegrationService.testConnection(mockPrisma, 'LDAP'))
                .rejects.toThrow('Integração não configurada ou inativa');
        });

        it('should throw if integration not found', async () => {
            IntegrationRepository.findByType.mockResolvedValue(null);
            await expect(IntegrationService.testConnection(mockPrisma, 'LDAP'))
                .rejects.toThrow('Integração não configurada ou inativa');
        });

        it('should return default simulated success for unknown type', async () => {
            IntegrationRepository.findByType.mockResolvedValue({
                isEnabled: true, config: {}
            });
            const result = await IntegrationService.testConnection(mockPrisma, 'OTHER_TYPE');
            expect(result.success).toBe(true);
            expect(result.message).toBe('Conexão simulada OK');
        });
    });

    describe('testAzureConnection', () => {
        it('should throw if config incomplete', async () => {
            await expect(IntegrationService.testAzureConnection(mockPrisma, { clientId: 'x', clientSecret: '', tenantIdAzure: '' }))
                .rejects.toThrow('Configuração incompleta');
        });

        it('should connect and fetch users', async () => {
            const config = { clientId: 'c', clientSecret: 's', tenantIdAzure: 't' };

            const mockCCA = {
                acquireTokenByClientCredential: jest.fn().mockResolvedValue({ accessToken: 'token' })
            };
            msal.ConfidentialClientApplication.mockImplementation(() => mockCCA);

            const mockApi = {
                select: jest.fn().mockReturnThis(),
                top: jest.fn().mockReturnThis(),
                get: jest.fn().mockResolvedValue({ value: [{ id: 1 }], '@odata.nextLink': null })
            };
            Client.init.mockImplementation((opts) => {
                opts.authProvider((err, token) => {
                    expect(token).toBe('token');
                });
                return { api: jest.fn(() => mockApi) };
            });

            const result = await IntegrationService.testAzureConnection(mockPrisma, config);

            expect(result.success).toBe(true);
            expect(result.users).toHaveLength(1);
        });

        it('should throw if authentication fails', async () => {
            const config = { clientId: 'c', clientSecret: 's', tenantIdAzure: 't' };
            const mockCCA = {
                acquireTokenByClientCredential: jest.fn().mockResolvedValue(null)
            };
            msal.ConfidentialClientApplication.mockImplementation(() => mockCCA);

            await expect(IntegrationService.testAzureConnection(mockPrisma, config))
                .rejects.toThrow('Falha na autenticação com Azure');
        });

        it('should handle paginated users correctly', async () => {
            const config = { clientId: 'c', clientSecret: 's', tenantIdAzure: 't' };
            const mockCCA = {
                acquireTokenByClientCredential: jest.fn().mockResolvedValue({ accessToken: 'token' })
            };
            msal.ConfidentialClientApplication.mockImplementation(() => mockCCA);

            const mockApi = {
                select: jest.fn().mockReturnThis(),
                top: jest.fn().mockReturnThis()
            };

            // First call has nextLink, second call doesn't
            mockApi.get = jest.fn()
                .mockResolvedValueOnce({ value: [{ id: 1 }], '@odata.nextLink': 'next_url' })
                .mockResolvedValueOnce({ value: [{ id: 2 }], '@odata.nextLink': null });

            Client.init.mockReturnValue({ api: jest.fn(() => mockApi) });

            const result = await IntegrationService.testAzureConnection(mockPrisma, config);

            expect(result.success).toBe(true);
            expect(result.users).toHaveLength(2);
            expect(result.users[0].id).toBe(1);
            expect(result.users[1].id).toBe(2);
        });
    });
});
