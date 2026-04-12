const AuthService = require('../../src/services/auth.service');
const UserRepository = require('../../src/repositories/user.repository');
const IntegrationRepository = require('../../src/repositories/integration.repository');
const LdapService = require('../../src/services/ldap.service');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const msal = require('@azure/msal-node');
const RefreshTokenService = require('../../src/services/refresh-token.service');
const loginAttempts = require('../../src/utils/login-attempts');

jest.mock('../../src/repositories/user.repository');
jest.mock('../../src/repositories/integration.repository');
jest.mock('../../src/services/ldap.service');
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');
jest.mock('@azure/msal-node');
jest.mock('../../src/services/refresh-token.service');
jest.mock('../../src/utils/login-attempts');
jest.mock('../../src/config/logger', () => ({ error: jest.fn(), debug: jest.fn() }));

const mockPrisma = {};

describe('AuthService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        loginAttempts.checkIfLocked.mockResolvedValue({ locked: false });
        loginAttempts.recordFailedAttempt.mockResolvedValue({ locked: false });
        loginAttempts.clearAttempts.mockResolvedValue();
        process.env.JWT_SECRET = 'secret';
    });

    describe('authenticate LOCAL', () => {
         it('should trap locked accounts explicitly throwing correctly natively', async () => {
              loginAttempts.checkIfLocked.mockResolvedValue({ locked: true, remainingMinutes: 5 });
              await expect(AuthService.authenticate(mockPrisma, 'e@e', 'p'))
                   .rejects.toEqual(expect.objectContaining({ statusCode: 429 }));
         });

         it('should record failures gracefully if user missing throwing generic error intuitively', async () => {
              UserRepository.findByEmail.mockResolvedValue(null);
              await expect(AuthService.authenticate(mockPrisma, 'e@e', 'p'))
                   .rejects.toEqual(expect.objectContaining({ statusCode: 401 }));
              expect(loginAttempts.recordFailedAttempt).toHaveBeenCalledWith(mockPrisma, 'e@e');
         });

         it('should block inactive profiles outright returning cleanly natively', async () => {
              UserRepository.findByEmail.mockResolvedValue({ isActive: false });
              await expect(AuthService.authenticate(mockPrisma, 'e@e', 'p'))
                   .rejects.toEqual(expect.objectContaining({ statusCode: 403 }));
         });

         it('should enforce proper gateway routing throwing elegantly explicitly parsing limits consistently', async () => {
              UserRepository.findByEmail.mockResolvedValue({ isActive: true, authProvider: 'AZURE' });
              await expect(AuthService.authenticate(mockPrisma, 'e@e', 'p'))
                   .rejects.toEqual(expect.objectContaining({ statusCode: 400, message: expect.stringContaining('Microsoft') }));
         });

         it('should block missed local passwords safely returning explicit limits processing safely natively', async () => {
              UserRepository.findByEmail.mockResolvedValue({ isActive: true, authProvider: 'LOCAL' }); // No .password
              await expect(AuthService.authenticate(mockPrisma, 'e@e', 'p'))
                   .rejects.toEqual(expect.objectContaining({ statusCode: 400, message: expect.stringContaining('não possui senha') }));
         });

         it('should validate bcrypt parsing failures processing attempts thoroughly capturing loops seamlessly internally', async () => {
              UserRepository.findByEmail.mockResolvedValue({ isActive: true, authProvider: 'LOCAL', password: 'hash' });
              bcrypt.compare.mockResolvedValue(false);
              
              // Standard failure
              await expect(AuthService.authenticate(mockPrisma, 'e@e', 'p'))
                   .rejects.toEqual(expect.objectContaining({ statusCode: 401 }));
              
              // Locked failure
              loginAttempts.recordFailedAttempt.mockResolvedValue({ locked: true });
              await expect(AuthService.authenticate(mockPrisma, 'e@e', 'p'))
                   .rejects.toEqual(expect.objectContaining({ statusCode: 429 }));
         });
         
         it('should map successful login clearing attempts yielding JWT implicitly successfully parsing defaults intelligently', async () => {
              UserRepository.findByEmail.mockResolvedValue({ isActive: true, authProvider: 'LOCAL', password: 'hash', id: 'u' });
              bcrypt.compare.mockResolvedValue(true);
              jwt.sign.mockReturnValue('token_123');

              const res = await AuthService.authenticate(mockPrisma, 'e@e', 'p');
              expect(loginAttempts.clearAttempts).toHaveBeenCalled();
              expect(res.token).toBe('token_123');
              // Implicit generateToken fallback mapping without `req`
              expect(res.refreshToken).toBeNull(); 
         });
    });

    describe('authenticate LDAP', () => {
         const ldapUser = { isActive: true, authProvider: 'LDAP', email: 'e' };

         it('should trap disabled configurations cleanly generating generic message evaluating accurately', async () => {
              UserRepository.findByEmail.mockResolvedValue(ldapUser);
              IntegrationRepository.findByType.mockResolvedValue(null);
              await expect(AuthService.authenticate(mockPrisma, 'e', 'p')).rejects.toEqual(expect.objectContaining({ statusCode: 400 }));

              IntegrationRepository.findByType.mockResolvedValue({ isEnabled: false });
              await expect(AuthService.authenticate(mockPrisma, 'e', 'p')).rejects.toEqual(expect.objectContaining({ statusCode: 400 }));
         });

         it('should execute backend triggers mapping faults explicitly', async () => {
              UserRepository.findByEmail.mockResolvedValue(ldapUser);
              IntegrationRepository.findByType.mockResolvedValue({ isEnabled: true, config: {} });
              LdapService.authenticate.mockRejectedValue(new Error('LDAP Fail'));
              
              await expect(AuthService.authenticate(mockPrisma, 'e', 'p')).rejects.toEqual(expect.objectContaining({ statusCode: 401, message: 'LDAP Fail' }));
              expect(loginAttempts.recordFailedAttempt).toHaveBeenCalled();
         });
         
         it('should map successful sequences natively routing effectively executing explicitly parsing JWT combinations consistently', async () => {
              UserRepository.findByEmail.mockResolvedValue({ ...ldapUser, roles: [{ id: 'r1' }] });
              IntegrationRepository.findByType.mockResolvedValue({ isEnabled: true, config: {} });
              LdapService.authenticate.mockResolvedValue(true);
              
              const req = { prisma: mockPrisma, tenantInfo: { slug: 't', schemaName: 's' } };
              RefreshTokenService.generateRefreshToken.mockResolvedValue('rt');
              jwt.sign.mockReturnValue('jwt');

              const res = await AuthService.authenticate(mockPrisma, 'e', 'p', req);
              expect(res.token).toBe('jwt');
              expect(res.refreshToken).toBe('rt');
              expect(res.user.password).toBeUndefined(); // stripped!
         });
    });

    describe('AZURE SSO', () => {
         const mockCca = { acquireTokenByCode: jest.fn() };
         
         beforeEach(() => {
              msal.ConfidentialClientApplication.mockImplementation(() => mockCca);
         });

         it('should block unauthorized tenants trapping implicitly checking properties explicitly implicitly safely', async () => {
              IntegrationRepository.findByType.mockResolvedValue(null);
              await expect(AuthService.loginWithAzure(mockPrisma, 'c', 't', 'r', {})).rejects.toThrow('não está ativa');
         });

         it('should process failed tokens executing thoroughly halting accurately', async () => {
              IntegrationRepository.findByType.mockResolvedValue({ isEnabled: true, config: { clientId: 'c', tenantIdAzure: 't', clientSecret: 's' } });
              mockCca.acquireTokenByCode.mockResolvedValue(null);
              
              await expect(AuthService.loginWithAzure(mockPrisma, 'c', 't', 'r', {})).rejects.toThrow('Falha');
         });

         it('should extract emails parsing arrays generating JWT dynamically skipping links safely seamlessly natively', async () => {
              IntegrationRepository.findByType.mockResolvedValue({ isEnabled: true, config: { clientId: 'c', tenantIdAzure: 't', clientSecret: 's' } });
              mockCca.acquireTokenByCode.mockResolvedValue({ account: { username: 'az@e', homeAccountId: 'id' } });
              
              UserRepository.findByEmail.mockResolvedValue(null);
              await expect(AuthService.loginWithAzure(mockPrisma, 'c', 't', 'r', {})).rejects.toThrow('não encontrado');

              UserRepository.findByEmail.mockResolvedValue({ isActive: false });
              await expect(AuthService.loginWithAzure(mockPrisma, 'c', 't', 'r', {})).rejects.toThrow('inativo');
              
              UserRepository.findByEmail.mockResolvedValue({ isActive: true, azureId: 'id' });
              jwt.sign.mockReturnValue('tok');
              
              const res = await AuthService.loginWithAzure(mockPrisma, 'c', 't', 'r', {});
              expect(res.token).toBe('tok');
         });
    });

    describe('getAzureConfig', () => {
         it('should fetch public properties stripping keys tracking successfully', async () => {
              IntegrationRepository.findByType.mockResolvedValue(null);
              await expect(AuthService.getAzureConfig(mockPrisma, 'slug')).rejects.toThrow('não disponível');
              
              IntegrationRepository.findByType.mockResolvedValue({ isEnabled: true, config: { clientId: 'c', tenantIdAzure: 't', secret: 'hide' } });
              await expect(AuthService.getAzureConfig(mockPrisma, 'slug')).resolves.toEqual({ clientId: 'c', tenantId: 't' });
         });
    });
});
