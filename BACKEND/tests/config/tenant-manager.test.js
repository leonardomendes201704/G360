jest.mock('@prisma/client', () => ({
    PrismaClient: jest.fn().mockImplementation(() => ({
        $connect: jest.fn().mockResolvedValue(undefined),
        $disconnect: jest.fn().mockResolvedValue(undefined),
        $queryRawUnsafe: jest.fn().mockResolvedValue([]),
        tenant: { findMany: jest.fn().mockResolvedValue([]) }
    }))
}));
jest.mock('../../src/config/logger', () => ({
    info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn()
}));

describe('TenantManager', () => {
    let TenantManager;
    beforeEach(() => {
        process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/testdb';
        jest.resetModules();
        jest.mock('@prisma/client', () => ({
            PrismaClient: jest.fn().mockImplementation(() => ({
                $connect: jest.fn().mockResolvedValue(undefined),
                $disconnect: jest.fn().mockResolvedValue(undefined),
                $queryRawUnsafe: jest.fn().mockResolvedValue([]),
                tenant: { findMany: jest.fn().mockResolvedValue([]) }
            }))
        }));
        jest.mock('../../src/config/logger', () => ({
            info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn()
        }));
        TenantManager = require('../../src/config/tenant-manager');
    });

    it('exports expected methods', () => {
        expect(TenantManager.getClientForTenant).toBeDefined();
        expect(TenantManager.getCatalogClient).toBeDefined();
        expect(TenantManager.getAllActiveTenants).toBeDefined();
    });

    it('getCatalogClient — returns a PrismaClient', () => {
        const client = TenantManager.getCatalogClient();
        expect(client).toBeDefined();
    });

    it('getClientForTenant — returns a PrismaClient for schema', async () => {
        const client = await TenantManager.getClientForTenant('tenant_acme');
        expect(client).toBeDefined();
        expect(client.$connect).toBeDefined();
    });
});
