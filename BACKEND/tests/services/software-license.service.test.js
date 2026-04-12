const SoftwareLicenseService = require('../../src/services/software-license.service');
const SoftwareLicenseRepository = require('../../src/repositories/software-license.repository');
const AuditLogRepository = require('../../src/repositories/audit-log.repository');

jest.mock('../../src/repositories/software-license.repository');
jest.mock('../../src/repositories/audit-log.repository');
jest.mock('../../src/utils/access-scope', () => ({
    getUserAccessScope: jest.fn().mockResolvedValue({ isAdmin: true })
}));

describe('SoftwareLicenseService', () => {
    const prisma = {};
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('create', () => {
        it('should throw 400 if expiration < purchase', async () => {
            await expect(SoftwareLicenseService.create(prisma, 't1', {
                purchaseDate: '2024-02-01',
                expirationDate: '2024-01-01'
            }, 1)).rejects.toMatchObject({ statusCode: 400 });
        });

        it('should create license and audit log', async () => {
            const mockLicense = { id: 1, name: 'Office' };
            SoftwareLicenseRepository.create.mockResolvedValue(mockLicense);

            const result = await SoftwareLicenseService.create(prisma, 't1', {
                name: 'Office',
                createdBy: 1
            }, 1);

            expect(result).toEqual(mockLicense);
            expect(AuditLogRepository.create).toHaveBeenCalled();
        });
    });

    describe('getById', () => {
        it('should throw 404 if not found', async () => {
            SoftwareLicenseRepository.findById.mockResolvedValue(null);
            await expect(SoftwareLicenseService.getById(prisma, 1, 't1', 1))
                .rejects.toMatchObject({ statusCode: 404 });
        });

        it('should return license', async () => {
            const mock = { id: 1 };
            SoftwareLicenseRepository.findById.mockResolvedValue(mock);
            const result = await SoftwareLicenseService.getById(prisma, 1, 't1', 1);
            expect(result).toEqual(mock);
        });
    });

    describe('getAll', () => {
        it('should return all licenses', async () => {
            const mockList = [{ id: 1 }, { id: 2 }];
            SoftwareLicenseRepository.findAll.mockResolvedValue(mockList);

            const result = await SoftwareLicenseService.getAll(prisma, 't1', 1);
            expect(result).toEqual(mockList);
        });
    });

    describe('update', () => {
        it('should throw 400 if expiration < purchase', async () => {
            SoftwareLicenseRepository.findById.mockResolvedValue({ id: 1 });
            await expect(SoftwareLicenseService.update(prisma, 1, 't1', {
                purchaseDate: '2024-02-01',
                expirationDate: '2024-01-01'
            }, 1)).rejects.toMatchObject({ statusCode: 400 });
        });

        it('should update license and audit log', async () => {
            SoftwareLicenseRepository.findById.mockResolvedValue({ id: 1, name: 'Old' });
            SoftwareLicenseRepository.update.mockResolvedValue({ id: 1, name: 'New' });

            const result = await SoftwareLicenseService.update(prisma, 1, 't1', { name: 'New' }, 1);

            expect(result).toEqual({ id: 1, name: 'New' });
            expect(AuditLogRepository.create).toHaveBeenCalled();
        });
    });

    describe('delete', () => {
        it('should delete license and audit log', async () => {
            SoftwareLicenseRepository.findById.mockResolvedValue({ id: 1 });
            SoftwareLicenseRepository.delete.mockResolvedValue(true);

            const result = await SoftwareLicenseService.delete(prisma, 1, 't1', 1);

            expect(result).toBe(true);
            expect(AuditLogRepository.create).toHaveBeenCalled();
        });
    });
});
