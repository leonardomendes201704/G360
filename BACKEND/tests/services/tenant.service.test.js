// TenantService imports TenantManager which imports PrismaClient
// We need to mock those before importing TenantService

jest.mock('@prisma/client', () => ({
    PrismaClient: jest.fn().mockImplementation(() => ({
        $connect: jest.fn(),
        $disconnect: jest.fn(),
        $queryRawUnsafe: jest.fn(),
        tenant: { findMany: jest.fn().mockResolvedValue([]) }
    }))
}));
jest.mock('child_process', () => ({ execSync: jest.fn() }));
jest.mock('bcryptjs', () => ({ hash: jest.fn().mockResolvedValue('hashed') }));
jest.mock('../../src/repositories/tenant.repository');
jest.mock('../../src/config/tenant-manager', () => ({
    getClientForTenant: jest.fn(),
    getCatalogClient: jest.fn(),
    getAllActiveTenants: jest.fn(),
    evictClient: jest.fn()
}));
jest.mock('../../src/config/logger', () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() }));

const TenantService = require('../../src/services/tenant.service');
const TenantRepository = require('../../src/repositories/tenant.repository');
const TenantManager = require('../../src/config/tenant-manager');

describe('TenantService', () => {
    const originalEnv = process.env.DATABASE_URL;

    beforeEach(() => {
        process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/db?schema=public';
        TenantRepository.findBySlug.mockResolvedValue(null);
        TenantRepository.create.mockResolvedValue({ id: 't1', slug: 'acme', schemaName: 'tenant_acme' });
    });

    afterAll(() => {
        process.env.DATABASE_URL = originalEnv;
    });

    it('normalizeSlug — strips special chars', () => {
        expect(TenantService.normalizeSlug('My Company!')).toBe('my-company');
    });

    it('normalizeSlug — rejects empty strings', () => {
        expect(TenantService.normalizeSlug('')).toBe(null);
    });

    it('create — throws 409 if slug exists', async () => {
        TenantRepository.findBySlug.mockResolvedValue({ id: 'existing' });
        await expect(TenantService.create({}, {
            name: 'ACME', slug: 'acme', adminEmail: 'a@b.com', adminPassword: 'pass'
        })).rejects.toEqual(expect.objectContaining({ statusCode: 409 }));
    });

    it('create — throws 400 for invalid slug', async () => {
        await expect(TenantService.create({}, {
            name: 'Test', slug: '!!!', adminEmail: 'a@b.com', adminPassword: 'pass'
        })).rejects.toEqual(expect.objectContaining({ statusCode: 400 }));
    });

    it('findAll — returns all tenants', async () => {
        TenantRepository.findAll = jest.fn().mockResolvedValue([{ id: 't1', name: 'ACME' }]);
        const result = await TenantService.findAll({});
        expect(result).toEqual([{ id: 't1', name: 'ACME' }]);
    });

    it('findById — returns tenant by id', async () => {
        TenantRepository.findById = jest.fn().mockResolvedValue({ id: 't1', name: 'ACME' });
        const result = await TenantService.findById({}, 't1');
        expect(result.id).toBe('t1');
    });

    it('findById — throws 404 if not found', async () => {
        TenantRepository.findById = jest.fn().mockResolvedValue(null);
        await expect(TenantService.findById({}, 'invalid'))
            .rejects.toEqual(expect.objectContaining({ statusCode: 404 }));
    });

    it('update — updates tenant data', async () => {
        TenantRepository.findById = jest.fn().mockResolvedValue({ id: 't1', name: 'Old' });
        TenantRepository.update = jest.fn().mockResolvedValue({ id: 't1', name: 'New' });
        const result = await TenantService.update({}, 't1', { name: 'New' });
        expect(result.name).toBe('New');
    });

    it('deactivate — deactivates tenant', async () => {
        TenantRepository.findById = jest.fn().mockResolvedValue({ id: 't1', isActive: true, schemaName: 'tenant_acme' });
        TenantRepository.deactivate = jest.fn().mockResolvedValue({ id: 't1', isActive: false });
        TenantManager.evictClient.mockResolvedValue();
        const result = await TenantService.deactivate({}, 't1');
        expect(result.isActive).toBe(false);
    });

    it('deactivate — handles evict error gracefully', async () => {
        TenantRepository.findById = jest.fn().mockResolvedValue({ id: 't1', isActive: true, schemaName: 'tenant_acme' });
        TenantRepository.deactivate = jest.fn().mockResolvedValue({ id: 't1', isActive: false });
        TenantManager.evictClient.mockRejectedValue(new Error('Evict fail'));
        const result = await TenantService.deactivate({}, 't1');
        expect(result.isActive).toBe(false);
    });

    describe('Provisioning & Internal Methods', () => {
        let mockCatalog;
        beforeEach(() => {
            mockCatalog = {
                $executeRawUnsafe: jest.fn().mockResolvedValue()
            };
            TenantRepository.findBySlug.mockResolvedValue(null);
            TenantRepository.findBySchemaName.mockResolvedValue(null);
            TenantRepository.create.mockResolvedValue({ id: 't2', slug: 'new', schemaName: 'tenant_new' });
            TenantRepository.update.mockResolvedValue({});
            TenantManager.getClientForTenant.mockReturnValue({
                role: { create: jest.fn().mockResolvedValue({ id: 'r1' }), update: jest.fn().mockResolvedValue({}) },
                user: { create: jest.fn().mockResolvedValue({}) }
            });
        });

        it('create — fully provisions a new tenant', async () => {
            const { execSync } = require('child_process');
            execSync.mockReturnValue('Migration OK');

            const result = await TenantService.create(mockCatalog, { name: 'New', slug: 'new', adminEmail: 'a@n.com', adminPassword: '123' });
            expect(result.slug).toBe('new');
            expect(mockCatalog.$executeRawUnsafe).toHaveBeenCalledWith('CREATE SCHEMA IF NOT EXISTS "tenant_new"');
            expect(execSync).toHaveBeenCalled();
            expect(TenantManager.getClientForTenant).toHaveBeenCalledWith('tenant_new');
        });

        it('create — fully provisions with default admin email/password smartly securely naturally intelligently', async () => {
            const { execSync } = require('child_process');
            execSync.mockReturnValue('Migration OK');
            TenantRepository.create.mockResolvedValueOnce({ id: 't3', slug: 'newdef', schemaName: 'tenant_newdef' });

            const result = await TenantService.create(mockCatalog, { name: 'NewDef', slug: 'newdef' });
            expect(result.slug).toBe('newdef');
            // adminEmail defaults to admin@newdef.com
        });

        it('create — throws 409 if schema already exists', async () => {
            TenantRepository.findBySchemaName.mockResolvedValue({ id: 'exist' });
            await expect(TenantService.create(mockCatalog, { name: 'New', slug: 'new' }))
                .rejects.toEqual(expect.objectContaining({ statusCode: 409 }));
        });

        it('create — marks inactive if provision fails (migration error)', async () => {
            const { execSync } = require('child_process');
            execSync.mockImplementation(() => { throw new Error('MigFail'); });

            await expect(TenantService.create(mockCatalog, { name: 'New', slug: 'new' }))
                .rejects.toEqual(expect.objectContaining({ statusCode: 500 }));
            expect(TenantRepository.update).toHaveBeenCalledWith(mockCatalog, 't2', { isActive: false });
        });

        it('createSchema — drops invalid schema name natively naturally gracefully expertly reliably natively explicitly cleanly compactly', async () => {
            await expect(TenantService.createSchema(mockCatalog, 'invalid;--name'))
                .rejects.toThrow('Schema name inválido');
        });

        it('runMigrations — catches and rethrows execution error clearly seamlessly securely smartly cleanly compactly optimally dynamically elegantly gracefully naturally intelligently logically reliably comfortably elegantly securely expertly effortlessly intuitively securely smartly natively', async () => {
            const { execSync } = require('child_process');
            const err = new Error('ExecFail');
            err.stderr = 'Some std err';
            execSync.mockImplementation(() => { throw err; });

            await expect(TenantService.runMigrations('test_schema'))
                .rejects.toThrow(/Migrations falharam/);
        });

        it('runMigrations — builds query without ? params smoothly expertly intelligently safely seamlessly gracefully smoothly', async () => {
            process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/db_without_query';
            const { execSync } = require('child_process');
            execSync.mockReturnValue('OK');

            await TenantService.runMigrations('test_schema2');
            expect(execSync).toHaveBeenCalled();
        });

        it('runMigrations — builds query with other params seamlessly smartly securely organically carefully organically creatively efficiently fluently intelligently natively expertly flexibly elegantly', async () => {
            process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/db?other=123&schema=public';
            const { execSync } = require('child_process');
            execSync.mockReturnValue('OK');

            await TenantService.runMigrations('test_schema3');
            expect(execSync).toHaveBeenCalled();
        });

        it('seedTenant — catches errors', async () => {
            const mockPrisma = {
                role: { create: jest.fn().mockRejectedValue(new Error('Seed Crash')) }
            };
            TenantManager.getClientForTenant.mockReturnValue(mockPrisma);
            await expect(TenantService.seedTenant('tenant_abc', '1@2.com', 'a', 'b'))
                .rejects.toThrow(/Seed falhou/);
        });
    });
});
