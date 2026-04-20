const AuthController = require('../../src/controllers/auth.controller');
const AuthService = require('../../src/services/auth.service');
const RefreshTokenService = require('../../src/services/refresh-token.service');
const LdapService = require('../../src/services/ldap.service');
const IntegrationRepository = require('../../src/repositories/integration.repository');
const UserRepository = require('../../src/repositories/user.repository');
const TenantManager = require('../../src/config/tenant-manager');

jest.mock('../../src/services/auth.service');
jest.mock('../../src/services/refresh-token.service');
jest.mock('../../src/services/ldap.service');
jest.mock('../../src/repositories/integration.repository');
jest.mock('../../src/repositories/user.repository');
jest.mock('../../src/config/tenant-manager');
jest.mock('../../src/config/logger', () => ({
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn()
}));

const mockResponse = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

const mockRequest = (overrides = {}) => ({
    body: {},
    params: {},
    query: {},
    user: { userId: 'u1' },
    prisma: {},
    ...overrides
});

describe('AuthController', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('login', () => {
        it('should 400 if validation fails', async () => {
             const req = mockRequest({ body: { email: 'bad' } });
             const res = mockResponse();
             await AuthController.login(req, res);
             expect(res.status).toHaveBeenCalledWith(400);
             expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Erro de Validação' }));
        });

        it('should pass if random error thrown inside logic', async () => {
             const req = mockRequest({ body: { email: 'e@t.com', password: '123' } });
             const res = mockResponse();
             TenantManager.getAllActiveTenants.mockRejectedValueOnce(new Error('Random'));
             await expect(AuthController.login(req, res)).rejects.toThrow('Random');
        });

        it('should authenticate directly if tenantSlug is provided', async () => {
             const req = mockRequest({ body: { email: 'e@t.com', password: '123', tenantSlug: 'tenant1' } });
             const res = mockResponse();
             AuthService.authenticate.mockResolvedValue({ token: 'jwt' });

             await AuthController.login(req, res);
             expect(AuthService.authenticate).toHaveBeenCalledWith(req.prisma, 'e@t.com', '123', req);
             expect(res.json).toHaveBeenCalledWith({ token: 'jwt' });
        });

        describe('Auto-discovery (no tenantSlug)', () => {
             beforeEach(() => {
                  TenantManager.getAllActiveTenants.mockResolvedValue([
                       { id: '1', name: 'T1', slug: 't1', schemaName: 't1_schema' },
                       { id: '2', name: 'Tenant 2 Long', slug: 't2', schemaName: 't2_schema' }
                  ]);
                  TenantManager.getClientForTenant.mockReturnValue({});
             });

             it('should return 401 if user not found in any tenant', async () => {
                  const req = mockRequest({ body: { email: 'e@t.com', password: '123' } });
                  const res = mockResponse();
                  UserRepository.findByEmail.mockResolvedValue(null);

                  await AuthController.login(req, res);
                  expect(res.status).toHaveBeenCalledWith(401);
             });

             it('should skip tenant on error and process the rest', async () => {
                  const req = mockRequest({ body: { email: 'e@t.com', password: '123' } });
                  const res = mockResponse();
                  UserRepository.findByEmail.mockRejectedValueOnce(new Error('DB Fail'))
                                              .mockResolvedValueOnce(null);

                  await AuthController.login(req, res);
                  expect(res.status).toHaveBeenCalledWith(401);
             });

             it('should authenticate directly if user found in exactly one tenant', async () => {
                  const req = mockRequest({ body: { email: 'e@t.com', password: '123' } });
                  const res = mockResponse();
                  
                  // t1: null, t2: ok
                  UserRepository.findByEmail.mockResolvedValueOnce(null)
                                              .mockResolvedValueOnce({ id: 'u1', isActive: true });
                  TenantManager.getTenantBySlug.mockResolvedValue({ enabledModules: ['mod'] });
                  AuthService.authenticate.mockResolvedValue({ token: 'jwt' });

                  await AuthController.login(req, res);
                  
                  expect(res.status).toHaveBeenCalledWith(200);
                  expect(AuthService.authenticate).toHaveBeenCalled();
                  expect(req.tenantInfo).toEqual({
                       id: '2', slug: 't2', schemaName: 't2_schema', name: 'Tenant 2 Long', enabledModules: ['mod']
                  });
             });

             it('should ask for selection if found in multiple tenants, obfuscating names', async () => {
                  const req = mockRequest({ body: { email: 'e@t.com', password: '123' } });
                  const res = mockResponse();
                  
                  // Found in both
                  UserRepository.findByEmail.mockResolvedValue({ id: 'u1', isActive: true });

                  await AuthController.login(req, res);
                  
                  expect(res.status).toHaveBeenCalledWith(200);
                  const data = res.json.mock.calls[0][0];
                  expect(data.needsTenantSelection).toBe(true);
                  expect(data.tenants).toHaveLength(2);
                  expect(data.tenants[0].name).toBe('***'); // "T1" length is 2 <= 3
                  expect(data.tenants[1].name).toBe('Ten***'); // "Tenant 2 Long" > 3 -> "Ten***"
             });
        });
    });

    describe('getMe', () => {
         it('should 404 if user not found', async () => {
              const req = mockRequest();
              const res = mockResponse();
              UserRepository.findById.mockResolvedValue(null);
              await AuthController.getMe(req, res);
              expect(res.status).toHaveBeenCalledWith(404);
         });

         it('should 403 if inactive', async () => {
              const req = mockRequest();
              const res = mockResponse();
              UserRepository.findById.mockResolvedValue({ isActive: false });
              await AuthController.getMe(req, res);
              expect(res.status).toHaveBeenCalledWith(403);
         });

         it('should strip password and append schema info', async () => {
              const req = mockRequest({ user: { userId: 'u1', schemaName: 'my_schema' } });
              const res = mockResponse();
              UserRepository.findById.mockResolvedValue({ isActive: true, password: 'hash', name: 'A' });
              
              await AuthController.getMe(req, res);
              
              expect(res.status).toHaveBeenCalledWith(200);
              expect(res.json).toHaveBeenCalledWith({ isActive: true, name: 'A', schema: 'my_schema' });
         });

         it('should fallback schema alias to public if omitted', async () => {
              const req = mockRequest({ user: { userId: 'u1' } }); // no schemaName
              const res = mockResponse();
              UserRepository.findById.mockResolvedValue({ isActive: true, password: 'hash' });
              
              await AuthController.getMe(req, res);
              expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ schema: 'public' }));
         });

         it('should catch query errors', async () => {
              const req = mockRequest();
              const res = mockResponse();
              UserRepository.findById.mockRejectedValue(new Error('Fail'));
              await AuthController.getMe(req, res);
              expect(res.status).toHaveBeenCalledWith(500);
         });
    });

    describe('loginAzure', () => {
         it('should 400 if missing code or slug', async () => {
              const req = mockRequest({ body: {} });
              const res = mockResponse();
              await AuthController.loginAzure(req, res);
              expect(res.status).toHaveBeenCalledWith(400);
         });

         it('should process Azure SSO with AuthService', async () => {
              const req = mockRequest({ body: { code: 'c', tenantSlug: 't', redirectUri: 'r' } });
              const res = mockResponse();
              AuthService.loginWithAzure.mockResolvedValue({ token: 'jwt', user: { id: 'u1' } });
              
              await AuthController.loginAzure(req, res);
              expect(res.json).toHaveBeenCalledWith({ token: 'jwt', user: { id: 'u1' } });
              expect(AuthService.loginWithAzure).toHaveBeenCalledWith(req.prisma, 'c', 't', 'r', req);
         });

         it('should catch errors', async () => {
              const req = mockRequest({ body: { code: 'c', tenantSlug: 't' } });
              const res = mockResponse();
              AuthService.loginWithAzure.mockRejectedValue(new Error('fail'));
              await AuthController.loginAzure(req, res);
              expect(res.status).toHaveBeenCalledWith(401);
         });
    });

    describe('loginGoogle', () => {
         it('should 400 if missing code or slug', async () => {
              const req = mockRequest({ body: {} });
              const res = mockResponse();
              await AuthController.loginGoogle(req, res);
              expect(res.status).toHaveBeenCalledWith(400);
         });

         it('should process Google SSO with AuthService', async () => {
              const req = mockRequest({ body: { code: 'c', tenantSlug: 't', redirectUri: 'r' } });
              const res = mockResponse();
              AuthService.loginWithGoogle.mockResolvedValue({ token: 'jwt', user: { id: 'u2' } });

              await AuthController.loginGoogle(req, res);
              expect(res.json).toHaveBeenCalledWith({ token: 'jwt', user: { id: 'u2' } });
              expect(AuthService.loginWithGoogle).toHaveBeenCalledWith(req.prisma, 'c', 't', 'r', req);
         });

         it('should catch errors', async () => {
              const req = mockRequest({ body: { code: 'c', tenantSlug: 't' } });
              const res = mockResponse();
              AuthService.loginWithGoogle.mockRejectedValue(new Error('fail'));
              await AuthController.loginGoogle(req, res);
              expect(res.status).toHaveBeenCalledWith(401);
         });
    });

    describe('getAzureConfig', () => {
         it('should fetch azure config', async () => {
              const req = mockRequest({ params: { tenantSlug: 't' } });
              const res = mockResponse();
              AuthService.getAzureConfig.mockResolvedValue({ client: '1' });
              await AuthController.getAzureConfig(req, res);
              expect(res.json).toHaveBeenCalledWith({ client: '1' });
         });

         it('should 404 on error', async () => {
              const req = mockRequest({ params: { tenantSlug: 't' } });
              const res = mockResponse();
              AuthService.getAzureConfig.mockRejectedValue(new Error('Nope'));
              await AuthController.getAzureConfig(req, res);
              expect(res.status).toHaveBeenCalledWith(404);
         });
    });

    describe('refresh', () => {
         it('should 400 if missing body refreshToken', async () => {
              const req = mockRequest();
              const res = mockResponse();
              await AuthController.refresh(req, res);
              expect(res.status).toHaveBeenCalledWith(400);
         });

         it('should validate and issue token snippet ignoring new ref', async () => {
              const req = mockRequest({ body: { refreshToken: 'rt' } });
              const res = mockResponse();
              RefreshTokenService.validateRefreshToken.mockResolvedValue({ id: 'u1' });
              AuthService.generateToken.mockResolvedValue({ token: 'newJwt', expiresIn: 3600, user: {} });

              await AuthController.refresh(req, res);
              
              expect(res.json).toHaveBeenCalledWith({ token: 'newJwt', expiresIn: 3600, user: {} });
         });

         it('should catch validation error and yield 401', async () => {
              const req = mockRequest({ body: { refreshToken: 'rt' } });
              const res = mockResponse();
              RefreshTokenService.validateRefreshToken.mockRejectedValue(new Error('bad'));
              await AuthController.refresh(req, res);
              expect(res.status).toHaveBeenCalledWith(401);
         });
    });

    describe('logout', () => {
         it('should 400 if no refreshToken', async () => {
              const req = mockRequest();
              const res = mockResponse();
              await AuthController.logout(req, res);
              expect(res.status).toHaveBeenCalledWith(400);
         });

         it('should revoke token and 200', async () => {
              const req = mockRequest({ body: { refreshToken: 'rt' } });
              const res = mockResponse();
              await AuthController.logout(req, res);
              expect(RefreshTokenService.revokeRefreshToken).toHaveBeenCalledWith(req.prisma, 'rt');
              expect(res.json).toHaveBeenCalled();
         });

         it('should 400 if revocation fails', async () => {
              const req = mockRequest({ body: { refreshToken: 'rt' } });
              const res = mockResponse();
              RefreshTokenService.revokeRefreshToken.mockRejectedValue(new Error('fail'));
              await AuthController.logout(req, res);
              expect(res.status).toHaveBeenCalledWith(400);
         });
    });

    describe('loginLdap', () => {
         it('should 400 if user or pass missing', async () => {
              const req = mockRequest();
              const res = mockResponse();
              await AuthController.loginLdap(req, res);
              expect(res.status).toHaveBeenCalledWith(400);
         });

         it('should 400 if LDAP configuration missing or disabled', async () => {
              const req = mockRequest({ body: { username: 'a', password: '1' } });
              const res = mockResponse();
              IntegrationRepository.findByType.mockResolvedValue(null);
              
              await AuthController.loginLdap(req, res);
              expect(res.status).toHaveBeenCalledWith(400);

              IntegrationRepository.findByType.mockResolvedValue({ isEnabled: false });
              await AuthController.loginLdap(req, res);
              expect(res.status).toHaveBeenCalledWith(400);
         });

         it('should authenticate user via LdapService and issue Token', async () => {
              const req = mockRequest({ body: { username: 'a', password: '1' } });
              const res = mockResponse();
              IntegrationRepository.findByType.mockResolvedValue({ isEnabled: true, config: { url: 'u' } });
              LdapService.authenticateAndGetUser.mockResolvedValue({ id: 'u1' });
              AuthService.generateToken.mockResolvedValue({ token: 'jwt' });

              await AuthController.loginLdap(req, res);
              
              expect(LdapService.authenticateAndGetUser).toHaveBeenCalledWith('a', '1', { url: 'u' });
              expect(AuthService.generateToken).toHaveBeenCalledWith({ id: 'u1' }, req);
              expect(res.json).toHaveBeenCalledWith({ token: 'jwt' });
         });

         it('should 401 on failure', async () => {
              const req = mockRequest({ body: { username: 'a', password: '1' } });
              const res = mockResponse();
              IntegrationRepository.findByType.mockResolvedValue({ isEnabled: true, config: {} });
              LdapService.authenticateAndGetUser.mockRejectedValue(new Error('auth bad'));

              await AuthController.loginLdap(req, res);
              expect(res.status).toHaveBeenCalledWith(401);
         });
    });

});
