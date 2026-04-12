const SupplierService = require('../../src/services/supplier.service');
const SupplierRepository = require('../../src/repositories/supplier.repository');
const AuditLogRepository = require('../../src/repositories/audit-log.repository');
const { getUserAccessScope } = require('../../src/utils/access-scope');

// Mocks
jest.mock('../../src/repositories/supplier.repository');
jest.mock('../../src/repositories/audit-log.repository');
jest.mock('../../src/utils/access-scope');

// Mock Prisma
jest.mock('../../src/config/database', () => ({
    prisma: {
        contract: { count: jest.fn() },
        asset: { count: jest.fn() },
        expense: { count: jest.fn() },
        projectProposal: { count: jest.fn() },
        supplier: { count: jest.fn() }
    }
}));

const { prisma } = require('../../src/config/database');

describe('SupplierService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Default: Admin Access
        getUserAccessScope.mockResolvedValue({ isAdmin: true, accessibleCostCenterIds: [] });
    });

    describe('create', () => {
        const validSupplierData = {
            name: 'Fornecedor Teste',
            document: '12345678000100',
            documentType: 'CNPJ',
            classification: 'TECNOLOGIA',
            email: 'fornecedor@example.com'
        };

        it('should create a supplier successfully', async () => {
            // ARRANGE
            SupplierRepository.findByDocument.mockResolvedValue(null);
            const createdSupplier = { id: 'supplier-1', ...validSupplierData };
            SupplierRepository.create.mockResolvedValue(createdSupplier);

            // ACT
            const result = await SupplierService.create(prisma, validSupplierData, 'user-1');

            // ASSERT
            expect(result.id).toBe('supplier-1');
            expect(SupplierRepository.create).toHaveBeenCalledWith(prisma, expect.objectContaining({
                document: '12345678000100'
            }));
        });

        it('should throw 409 error if document already exists', async () => {
            // ARRANGE
            SupplierRepository.findByDocument.mockResolvedValue({ id: 'existing-supplier' });

            // ACT & ASSERT
            await expect(SupplierService.create(prisma, validSupplierData, 'user-1'))
                .rejects
                .toMatchObject({ statusCode: 409 });
        });

        it('should create audit log when userId is provided', async () => {
            // ARRANGE
            SupplierRepository.findByDocument.mockResolvedValue(null);
            SupplierRepository.create.mockResolvedValue({ id: 'supplier-1', ...validSupplierData });

            // ACT
            await SupplierService.create(prisma, validSupplierData, 'user-123');

            // ASSERT
            expect(AuditLogRepository.create).toHaveBeenCalledWith(prisma, expect.objectContaining({
                userId: 'user-123',
                action: 'criou fornecedor'
            }));
        });
    });

    describe('getById', () => {
        it('should return supplier when found', async () => {
            // ARRANGE
            const mockSupplier = { id: 'supplier-1', name: 'Test' };
            SupplierRepository.findById.mockResolvedValue(mockSupplier);

            // ACT
            const result = await SupplierService.getById(prisma, 'supplier-1', 'admin-user');

            // ASSERT
            expect(result).toEqual(mockSupplier);
        });

        it('should throw 404 error if supplier not found', async () => {
            // ARRANGE
            SupplierRepository.findById.mockResolvedValue(null);

            // ACT & ASSERT
            // ACT & ASSERT
            await expect(SupplierService.getById(prisma, 'nonexistent', 'user-1'))
                .rejects
                .toMatchObject({ statusCode: 404 });
        });

        it('should allow access for manager user (RBAC handled at route level)', async () => {
            // ARRANGE
            const mockSupplier = { id: 'supplier-1', name: 'Test' };
            SupplierRepository.findById.mockResolvedValue(mockSupplier);

            getUserAccessScope.mockResolvedValue({
                isAdmin: false,
                isManager: true,
                accessibleCostCenterIds: ['cc-1']
            });

            // ACT
            const result = await SupplierService.getById(prisma, 'supplier-1', 'manager-user');

            // ASSERT — access is allowed (RBAC at route level)
            expect(result).toEqual(mockSupplier);
        });

        it('should allow access for regular user (RBAC handled at route level)', async () => {
            // ARRANGE
            const mockSupplier = { id: 'supplier-1', name: 'Test' };
            SupplierRepository.findById.mockResolvedValue(mockSupplier);

            getUserAccessScope.mockResolvedValue({
                isAdmin: false,
                isManager: false,
                accessibleCostCenterIds: []
            });

            // ACT
            const result = await SupplierService.getById(prisma, 'supplier-1', 'regular-user');

            // ASSERT — access is allowed (RBAC at route level)
            expect(result).toEqual(mockSupplier);
        });

    });

    describe('update', () => {
        const existingSupplier = {
            id: 'supplier-1',
            name: 'Original Name',
            document: '12345678000100'
        };

        it('should update supplier successfully', async () => {
            // ARRANGE
            SupplierRepository.findById.mockResolvedValue(existingSupplier);
            SupplierRepository.update.mockResolvedValue({ ...existingSupplier, name: 'Updated Name' });

            // ACT
            const result = await SupplierService.update(prisma, 'supplier-1', { name: 'Updated Name' }, 'user-1');

            // ASSERT
            expect(result.name).toBe('Updated Name');
        });

        it('should throw 409 if updating document to one that already exists (different supplier)', async () => {
            // ARRANGE
            SupplierRepository.findById.mockResolvedValue(existingSupplier);
            SupplierRepository.findByDocument.mockResolvedValue({
                id: 'other-supplier', // Different supplier
                document: '99999999000199'
            });

            // ACT & ASSERT
            // ACT & ASSERT
            await expect(SupplierService.update(prisma, 'supplier-1', { document: '99999999000199' }, 'user-1'))
                .rejects
                .toEqual(expect.objectContaining({
                    statusCode: 409,
                    message: expect.stringContaining('Ja existe outro fornecedor')
                }));
        });

        it('should allow updating document to same value (same supplier)', async () => {
            // ARRANGE
            SupplierRepository.findById.mockResolvedValue(existingSupplier);
            SupplierRepository.findByDocument.mockResolvedValue({
                id: 'supplier-1', // Same supplier
                document: '12345678000100'
            });
            SupplierRepository.update.mockResolvedValue(existingSupplier);

            // ACT & ASSERT
            // ACT & ASSERT
            await expect(SupplierService.update(prisma, 'supplier-1', { document: '12345678000100' }, 'user-1'))
                .resolves
                .toBeDefined();
        });
    });

    describe('delete', () => {
        const existingSupplier = { id: 'supplier-1', name: 'Test Supplier' };

        beforeEach(() => {
            SupplierRepository.findById.mockResolvedValue(existingSupplier);
        });

        it('should delete supplier successfully when no dependencies exist', async () => {
            // ARRANGE
            prisma.contract.count.mockResolvedValue(0);
            prisma.asset.count.mockResolvedValue(0);
            prisma.expense.count.mockResolvedValue(0);
            prisma.projectProposal.count.mockResolvedValue(0);
            SupplierRepository.delete.mockResolvedValue(true);

            // ACT
            const result = await SupplierService.delete(prisma, 'supplier-1', 'user-1');

            // ASSERT
            expect(result).toBe(true);
            expect(SupplierRepository.delete).toHaveBeenCalledWith(prisma, 'supplier-1');
        });

        it('should throw 400 error when supplier has contracts', async () => {
            // ARRANGE
            prisma.contract.count.mockResolvedValue(2);

            // ACT & ASSERT
            // ACT & ASSERT
            await expect(SupplierService.delete(prisma, 'supplier-1', 'user-1'))
                .rejects
                .toEqual(expect.objectContaining({
                    statusCode: 400,
                    message: expect.stringContaining('contratos vinculados')
                }));
        });

        it('should throw 400 error when supplier has assets', async () => {
            // ARRANGE
            prisma.contract.count.mockResolvedValue(0);
            prisma.asset.count.mockResolvedValue(5);

            // ACT & ASSERT
            // ACT & ASSERT
            await expect(SupplierService.delete(prisma, 'supplier-1', 'user-1'))
                .rejects
                .toEqual(expect.objectContaining({
                    statusCode: 400,
                    message: expect.stringContaining('ativos vinculados')
                }));
        });

        it('should throw 400 error when supplier has expenses', async () => {
            // ARRANGE
            prisma.contract.count.mockResolvedValue(0);
            prisma.asset.count.mockResolvedValue(0);
            prisma.expense.count.mockResolvedValue(3);

            // ACT & ASSERT
            // ACT & ASSERT
            await expect(SupplierService.delete(prisma, 'supplier-1', 'user-1'))
                .rejects
                .toEqual(expect.objectContaining({
                    statusCode: 400,
                    message: expect.stringContaining('despesas vinculadas')
                }));
        });

        it('should throw 400 error when supplier has project proposals', async () => {
            // ARRANGE
            prisma.contract.count.mockResolvedValue(0);
            prisma.asset.count.mockResolvedValue(0);
            prisma.expense.count.mockResolvedValue(0);
            prisma.projectProposal.count.mockResolvedValue(1);

            // ACT & ASSERT
            // ACT & ASSERT
            await expect(SupplierService.delete(prisma, 'supplier-1', 'user-1'))
                .rejects
                .toEqual(expect.objectContaining({
                    statusCode: 400,
                    message: expect.stringContaining('propostas de projeto')
                }));
        });

        it('should create audit log after successful deletion', async () => {
            // ARRANGE
            prisma.contract.count.mockResolvedValue(0);
            prisma.asset.count.mockResolvedValue(0);
            prisma.expense.count.mockResolvedValue(0);
            prisma.projectProposal.count.mockResolvedValue(0);
            SupplierRepository.delete.mockResolvedValue(true);

            // ACT
            await SupplierService.delete(prisma, 'supplier-1', 'user-123');

            // ASSERT
            expect(AuditLogRepository.create).toHaveBeenCalledWith(prisma, expect.objectContaining({
                userId: 'user-123',
                action: 'excluiu fornecedor',
                module: 'SUPPLIERS'
            }));
        });
    });
});
