const { tenantResolver, tenantResolverPublic, tenantResolverAdmin } = require('../../src/middlewares/tenant-resolver.middleware');
const TenantManager = require('../../src/config/tenant-manager');

jest.mock('../../src/config/tenant-manager');
jest.mock('../../src/config/logger', () => ({
    info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn()
}));

const mockRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

const mockPrismaClient = { user: { findMany: jest.fn() } };

describe('Tenant Resolver Middleware', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        TenantManager.getClientForTenant.mockReturnValue(mockPrismaClient);
        TenantManager.getDefaultClient.mockReturnValue(mockPrismaClient);
        TenantManager.getCatalogClient.mockReturnValue(mockPrismaClient);
    });

    describe('tenantResolver (authenticated routes)', () => {
        it('should resolve from JWT schemaName', async () => {
            const middleware = tenantResolver();
            const req = {
                user: { schemaName: 'tenant_demo', tenantSlug: 'demo' },
                headers: {}
            };
            const res = mockRes();
            const next = jest.fn();

            await middleware(req, res, next);

            expect(TenantManager.getClientForTenant).toHaveBeenCalledWith('tenant_demo');
            expect(req.prisma).toBe(mockPrismaClient);
            expect(req.tenantInfo.slug).toBe('demo');
            expect(next).toHaveBeenCalled();
        });

        it('should fallback to x-tenant-slug header', async () => {
            const middleware = tenantResolver();
            TenantManager.getTenantBySlug.mockResolvedValue({
                slug: 'header-tenant', schemaName: 'header_schema'
            });
            const req = {
                user: {},
                headers: { 'x-tenant-slug': 'header-tenant' }
            };
            const res = mockRes();
            const next = jest.fn();

            await middleware(req, res, next);

            expect(TenantManager.getTenantBySlug).toHaveBeenCalledWith('header-tenant');
            expect(next).toHaveBeenCalled();
        });

        it('should return 404 for unknown header tenant', async () => {
            const middleware = tenantResolver();
            TenantManager.getTenantBySlug.mockResolvedValue(null);
            const req = {
                user: {},
                headers: { 'x-tenant-slug': 'nonexistent' }
            };
            const res = mockRes();
            const next = jest.fn();

            await middleware(req, res, next);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(next).not.toHaveBeenCalled();
        });

        it('should fallback to default client as last resort', async () => {
            const middleware = tenantResolver();
            const req = { user: {}, headers: {} };
            const res = mockRes();
            const next = jest.fn();

            await middleware(req, res, next);

            expect(TenantManager.getDefaultClient).toHaveBeenCalled();
            expect(req.tenantInfo.slug).toBe('default');
            expect(next).toHaveBeenCalled();
        });
    });

    describe('tenantResolverPublic (login/public routes)', () => {
        it('should resolve from URL param tenantSlug', async () => {
            const middleware = tenantResolverPublic();
            TenantManager.getTenantBySlug.mockResolvedValue({
                id: 't1', slug: 'demo', schemaName: 'demo_schema',
                name: 'Demo Corp', plan: 'PRO', enabledModules: null
            });
            const req = { params: { tenantSlug: 'demo' }, body: {}, headers: {} };
            const res = mockRes();
            const next = jest.fn();

            await middleware(req, res, next);

            expect(TenantManager.getTenantBySlug).toHaveBeenCalledWith('demo');
            expect(req.tenantInfo.slug).toBe('demo');
            expect(req.tenantInfo.plan).toBe('PRO');
            expect(next).toHaveBeenCalled();
        });

        it('should return 404 for unknown tenant slug', async () => {
            const middleware = tenantResolverPublic();
            TenantManager.getTenantBySlug.mockResolvedValue(null);
            const req = { params: { tenantSlug: 'nonexistent' }, body: {}, headers: {} };
            const res = mockRes();
            const next = jest.fn();

            await middleware(req, res, next);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(next).not.toHaveBeenCalled();
        });

        it('should fallback to default client when no slug provided', async () => {
            const middleware = tenantResolverPublic();
            const req = { params: {}, body: {}, headers: {} };
            const res = mockRes();
            const next = jest.fn();

            await middleware(req, res, next);

            expect(TenantManager.getDefaultClient).toHaveBeenCalled();
            expect(req.tenantInfo.slug).toBe('default');
        });

        it('should try body tenantSlug as fallback', async () => {
            const middleware = tenantResolverPublic();
            TenantManager.getTenantBySlug.mockResolvedValue({
                id: 't1', slug: 'body-tenant', schemaName: 'body_schema',
                name: 'Body Corp', plan: 'BASIC'
            });
            const req = { params: {}, body: { tenantSlug: 'body-tenant' }, headers: {} };
            const res = mockRes();
            const next = jest.fn();

            await middleware(req, res, next);

            expect(TenantManager.getTenantBySlug).toHaveBeenCalledWith('body-tenant');
            expect(next).toHaveBeenCalled();
        });
    });

    describe('tenantResolverAdmin (super-admin routes)', () => {
        it('should use catalog client', () => {
            const middleware = tenantResolverAdmin();
            const req = {};
            const res = mockRes();
            const next = jest.fn();

            middleware(req, res, next);

            expect(TenantManager.getCatalogClient).toHaveBeenCalled();
            expect(req.prisma).toBe(mockPrismaClient);
            expect(req.tenantInfo.slug).toBe('admin');
            expect(req.tenantInfo.schemaName).toBe('public');
            expect(next).toHaveBeenCalled();
        });
    });
});
