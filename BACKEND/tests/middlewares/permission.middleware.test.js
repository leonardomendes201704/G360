const { authorize, authorizeSuperAdmin } = require('../../src/middlewares/permission.middleware');

jest.mock('../../src/config/logger', () => ({
    info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn()
}));

const mockRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

describe('Permission Middleware', () => {
    describe('authorize(module, action)', () => {
        it('should return 403 if req.user has no roles', async () => {
            const middleware = authorize('PROJECTS', 'READ');
            const req = { user: {}, prisma: { user: { findUnique: jest.fn() } } };
            const res = mockRes();
            const next = jest.fn();

            await middleware(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({ error: 'Acesso negado. Perfil não encontrado.' });
            expect(next).not.toHaveBeenCalled();
        });

        it('should return 403 if user has no roles in database', async () => {
            const middleware = authorize('PROJECTS', 'READ');
            const req = {
                user: { userId: 'u1', roleId: 'r1' },
                prisma: { user: { findUnique: jest.fn().mockResolvedValue({ roles: [] }) } }
            };
            const res = mockRes();
            const next = jest.fn();

            await middleware(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({ error: 'Acesso negado. Nenhum perfil atribuído.' });
        });

        it('should allow Super Admin to bypass all checks', async () => {
            const middleware = authorize('ANYTHING', 'WHATEVER');
            const user = {
                roles: [{ name: 'Super Admin', permissions: [] }]
            };
            const req = {
                user: { userId: 'u1', roleId: 'r1' },
                prisma: { user: { findUnique: jest.fn().mockResolvedValue(user) } }
            };
            const res = mockRes();
            const next = jest.fn();

            await middleware(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(res.status).not.toHaveBeenCalled();
        });

        it('should allow user with matching permission', async () => {
            const middleware = authorize('PROJECTS', 'READ');
            const user = {
                roles: [{
                    name: 'Gestor',
                    permissions: [{ module: 'PROJECTS', action: 'READ' }]
                }]
            };
            const req = {
                user: { userId: 'u1', roleId: 'r1' },
                prisma: { user: { findUnique: jest.fn().mockResolvedValue(user) } }
            };
            const res = mockRes();
            const next = jest.fn();

            await middleware(req, res, next);

            expect(next).toHaveBeenCalled();
        });

        it('should allow user with ALL permission on module', async () => {
            const middleware = authorize('PROJECTS', 'DELETE');
            const user = {
                roles: [{
                    name: 'Admin',
                    permissions: [{ module: 'PROJECTS', action: 'ALL' }]
                }]
            };
            const req = {
                user: { userId: 'u1', roleId: 'r1' },
                prisma: { user: { findUnique: jest.fn().mockResolvedValue(user) } }
            };
            const res = mockRes();
            const next = jest.fn();

            await middleware(req, res, next);

            expect(next).toHaveBeenCalled();
        });

        it('should deny user without matching permission', async () => {
            const middleware = authorize('FINANCE', 'DELETE');
            const user = {
                roles: [{
                    name: 'Colaborador',
                    permissions: [{ module: 'FINANCE', action: 'READ' }]
                }]
            };
            const req = {
                user: { userId: 'u1', roleId: 'r1' },
                prisma: { user: { findUnique: jest.fn().mockResolvedValue(user) } }
            };
            const res = mockRes();
            const next = jest.fn();

            await middleware(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({
                error: 'Acesso negado. Requer permissão DELETE em FINANCE.'
            });
        });

        it('should deny user with permission on wrong module', async () => {
            const middleware = authorize('FINANCE', 'READ');
            const user = {
                roles: [{
                    name: 'Colaborador',
                    permissions: [{ module: 'PROJECTS', action: 'READ' }]
                }]
            };
            const req = {
                user: { userId: 'u1', roleId: 'r1' },
                prisma: { user: { findUnique: jest.fn().mockResolvedValue(user) } }
            };
            const res = mockRes();
            const next = jest.fn();

            await middleware(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);
        });

        it('should check permissions across multiple roles', async () => {
            const middleware = authorize('ASSETS', 'WRITE');
            const user = {
                roles: [
                    { name: 'Role A', permissions: [{ module: 'PROJECTS', action: 'READ' }] },
                    { name: 'Role B', permissions: [{ module: 'ASSETS', action: 'WRITE' }] }
                ]
            };
            const req = {
                user: { userId: 'u1', roleId: 'r1' },
                prisma: { user: { findUnique: jest.fn().mockResolvedValue(user) } }
            };
            const res = mockRes();
            const next = jest.fn();

            await middleware(req, res, next);

            expect(next).toHaveBeenCalled();
        });

        it('should set req.roles after successful authorization', async () => {
            const middleware = authorize('PROJECTS', 'READ');
            const roles = [{ name: 'Gestor', permissions: [{ module: 'PROJECTS', action: 'ALL' }] }];
            const req = {
                user: { userId: 'u1', roleId: 'r1' },
                prisma: { user: { findUnique: jest.fn().mockResolvedValue({ roles }) } }
            };
            const res = mockRes();
            const next = jest.fn();

            await middleware(req, res, next);

            expect(req.roles).toEqual(roles);
        });
    });

    describe('authorizeSuperAdmin', () => {
        it('should allow Super Admin', async () => {
            const req = {
                user: { userId: 'u1', roleId: 'r1', schemaName: 'public' },
                prisma: {
                    user: {
                        findUnique: jest.fn().mockResolvedValue({
                            roles: [{ name: 'Super Admin' }]
                        })
                    }
                }
            };
            const res = mockRes();
            const next = jest.fn();

            await authorizeSuperAdmin(req, res, next);

            expect(next).toHaveBeenCalled();
        });

        it('should deny non-Super Admin', async () => {
            const req = {
                user: { userId: 'u1', roleId: 'r1' },
                prisma: {
                    user: {
                        findUnique: jest.fn().mockResolvedValue({
                            roles: [{ name: 'Gestor' }]
                        })
                    }
                }
            };
            const res = mockRes();
            const next = jest.fn();

            await authorizeSuperAdmin(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({ error: 'Acesso negado. Requer perfil Global Super Admin.' });
        });

        it('should deny user with no role info', async () => {
            const req = { user: {} };
            const res = mockRes();
            const next = jest.fn();

            await authorizeSuperAdmin(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);
        });

        it('should handle case-insensitive Super Admin check', async () => {
            const req = {
                user: { userId: 'u1', roleId: 'r1', schemaName: 'public' },
                prisma: {
                    user: {
                        findUnique: jest.fn().mockResolvedValue({
                            roles: [{ name: 'superadmin' }]
                        })
                    }
                }
            };
            const res = mockRes();
            const next = jest.fn();

            await authorizeSuperAdmin(req, res, next);

            expect(next).toHaveBeenCalled();
        });
    });
});
