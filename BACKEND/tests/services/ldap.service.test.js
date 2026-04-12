const LdapService = require('../../src/services/ldap.service');
const ldap = require('ldapjs');
const UserRepository = require('../../src/repositories/user.repository');

jest.mock('ldapjs');
jest.mock('../../src/repositories/user.repository');

describe('LdapService', () => {
    let mockClient;

    beforeEach(() => {
        mockClient = {
            on: jest.fn(),
            bind: jest.fn(),
            search: jest.fn(),
            unbind: jest.fn(),
            destroy: jest.fn()
        };
        ldap.createClient.mockReturnValue(mockClient);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('createClient', () => {
        it('should structure config correctly for SSL', () => {
            LdapService.createClient({ host: 'localhost', port: 123, useSsl: true });
            expect(ldap.createClient).toHaveBeenCalledWith(expect.objectContaining({
                url: 'ldaps://localhost:123',
                tlsOptions: { rejectUnauthorized: false }
            }));
        });
    });

    describe('testConnection', () => {
        it('should handle client error event gracefully', async () => {
            mockClient.on.mockImplementation((event, cb) => {
                if (event === 'error') cb(new Error('Network failure'));
            });
            await expect(LdapService.testConnection({ host: 'localhost' }))
                .rejects.toThrow('Erro de conexão LDAP: Network failure');
            expect(mockClient.destroy).toHaveBeenCalled();
        });

        it('should resolve on successful bind', async () => {
            mockClient.bind.mockImplementation((dn, pass, cb) => cb(null)); // Success

            const result = await LdapService.testConnection({ host: 'localhost', bindDN: 'user', bindPassword: 'pwd' });

            expect(result.success).toBe(true);
            expect(mockClient.unbind).toHaveBeenCalled();
        });

        it('should reject on bind error', async () => {
            mockClient.bind.mockImplementation((dn, pass, cb) => cb(new Error('Auth failed')));

            await expect(LdapService.testConnection({ host: 'localhost' }))
                .rejects.toThrow('Falha na autenticação');
        });
    });

    describe('authenticate', () => {
        const config = { host: 'loc', bindDN: 'admin', bindPassword: 'pwd', baseDN: 'dc=loc' };
        
        it('should handle client error event gracefully', async () => {
            mockClient.on.mockImplementation((event, cb) => {
                // mockClient.on gets called multiple times. We specifically want the 'error' one.
                if (event === 'error') cb(new Error('Network failure'));
            });
            await expect(LdapService.authenticate('user', 'pass', config))
                .rejects.toThrow('Erro de conexão LDAP: Network failure');
            expect(mockClient.destroy).toHaveBeenCalled();
        });

        it('should reject if service bind fails', async () => {
            mockClient.bind.mockImplementation((dn, pass, cb) => cb(new Error('Bind Err')));
            await expect(LdapService.authenticate('user', 'pass', config))
                .rejects.toThrow('Falha na conexão com o servidor LDAP');
            expect(mockClient.destroy).toHaveBeenCalled();
        });

        it('should reject if search yields error', async () => {
            mockClient.bind.mockImplementation((dn, pass, cb) => cb(null)); // bind OK
            mockClient.search.mockImplementation((base, opts, cb) => cb(new Error('Search Err')));

            await expect(LdapService.authenticate('user', 'pass', config))
                .rejects.toThrow('Erro ao buscar usuário no diretório');
            expect(mockClient.unbind).toHaveBeenCalled();
        });

        it('should handle custom search config string', async () => {
            mockClient.bind.mockImplementation((dn, pass, cb) => cb(null));
            const mockSearchEmitter = { on: jest.fn() };
            mockClient.search.mockImplementation((base, opts, cb) => {
                expect(opts.filter).toBe('uid=testuser'); // Validates string replacement
               cb(null, mockSearchEmitter);
            });
            // Don't await so it doesn't hang in this mock setup
            LdapService.authenticate('testuser', 'pass', { ...config, userSearchFilter: 'uid={{username}}' }).catch(()=> {});
        });

        it('should reject if search result yields error event', async () => {
            mockClient.bind.mockImplementation((dn, pass, cb) => cb(null));
            const mockSearchEmitter = { on: jest.fn() };
            mockClient.search.mockImplementation((base, opts, cb) => {
                cb(null, mockSearchEmitter);
                const errorHandler = mockSearchEmitter.on.mock.calls.find(c => c[0] === 'error')[1];
                errorHandler(new Error('Search Event Err'));
            });

            await expect(LdapService.authenticate('user', 'pass', config))
                .rejects.toThrow('Erro na busca: Search Event Err');
        });

        it('should reject if search ends with no user found', async () => {
            mockClient.bind.mockImplementation((dn, pass, cb) => cb(null));
            const mockSearchEmitter = { on: jest.fn() };
            mockClient.search.mockImplementation((base, opts, cb) => {
                cb(null, mockSearchEmitter);
                // Trigger 'end' without 'searchEntry'
                const endHandler = mockSearchEmitter.on.mock.calls.find(c => c[0] === 'end')[1];
                endHandler();
            });

            await expect(LdapService.authenticate('user', 'pass', config))
                .rejects.toThrow('Usuário não encontrado no diretório');
        });

        it('should reject if user bind fails (invalid password)', async () => {
            mockClient.bind
                .mockImplementationOnce((dn, pass, cb) => cb(null)) // Service bind OK
                .mockImplementationOnce((dn, pass, cb) => cb(new Error('Bad Pass'))); // User bind Fails

            const mockSearchEmitter = { on: jest.fn() };
            mockClient.search.mockImplementation((base, opts, cb) => {
                cb(null, mockSearchEmitter);
                const entryHandler = mockSearchEmitter.on.mock.calls.find(c => c[0] === 'searchEntry')[1];
                entryHandler({ dn: 'cn=U,dc=L', object: {} }); // no specific attributes for coverage

                const endHandler = mockSearchEmitter.on.mock.calls.find(c => c[0] === 'end')[1];
                endHandler();
            });

            await expect(LdapService.authenticate('user', 'pass', config))
                .rejects.toThrow('Credenciais inválidas');
            expect(mockClient.destroy).toHaveBeenCalled();
        });

        it('should authenticate correctly', async () => {
            mockClient.bind
                .mockImplementationOnce((dn, pass, cb) => cb(null)) // Service bind
                .mockImplementationOnce((dn, pass, cb) => cb(null)); // User bind

            const mockSearchEmitter = { on: jest.fn() };
            mockClient.search.mockImplementation((base, opts, cb) => {
                cb(null, mockSearchEmitter);
                const entryHandler = mockSearchEmitter.on.mock.calls.find(c => c[0] === 'searchEntry')[1];
                entryHandler({
                    dn: 'cn=User,dc=L',
                    object: { sAMAccountName: 'usr', displayName: 'Display', mail: 'a@b.com', memberOf: ['G1'] }
                });

                const endHandler = mockSearchEmitter.on.mock.calls.find(c => c[0] === 'end')[1];
                endHandler();
            });

            const result = await LdapService.authenticate('user', 'pass', config);
            expect(result.username).toBe('usr');
            expect(result.name).toBe('Display');
            expect(result.groups).toContain('G1');
            expect(result.email).toBe('a@b.com');
        });
    });

    describe('authenticateAndGetUser', () => {
        let mockPrisma = {};
        const config = { host: 'loc' };

        beforeEach(() => {
            jest.spyOn(LdapService, 'authenticate').mockResolvedValue({ email: 'a@b.com' });
        });

        it('should throw if local DB user is not found', async () => {
            UserRepository.findByEmail.mockResolvedValue(null);
            await expect(LdapService.authenticateAndGetUser(mockPrisma, 'u', 'p', config))
                .rejects.toThrow(/não encontrado no sistema/);
        });

        it('should throw if local DB user is inactive', async () => {
            UserRepository.findByEmail.mockResolvedValue({ isActive: false });
            await expect(LdapService.authenticateAndGetUser(mockPrisma, 'u', 'p', config))
                .rejects.toThrow('Usuário inativo');
        });

        it('should return valid active local DB user', async () => {
            UserRepository.findByEmail.mockResolvedValue({ isActive: true, id: '1' });
            const res = await LdapService.authenticateAndGetUser(mockPrisma, 'u', 'p', config);
            expect(res.id).toBe('1');
        });
    });
});
