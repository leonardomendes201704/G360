const mockPrisma = {
    costCenter: {
        findUnique: jest.fn()
    }
};

jest.mock('../../src/config/database', () => ({
    prisma: mockPrisma
}));

jest.mock('../../src/repositories/user.repository');
jest.mock('../../src/repositories/audit-log.repository');
jest.mock('bcryptjs');

const UserRepository = require('../../src/repositories/user.repository');
const AuditLogRepository = require('../../src/repositories/audit-log.repository');
const bcrypt = require('bcryptjs');
const UserService = require('../../src/services/user.service');

describe('UserService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('createUser', () => {
        const validUserData = {
            name: 'Test User',
            email: 'test@example.com',
            password: '12345678@aA',
            roleIds: ['role-1'],
            costCenterId: 'cc-1'
        };

        it('should create a user successfully with hashed password', async () => {
            // ARRANGE
            UserRepository.findByEmail.mockResolvedValue(null);
            bcrypt.genSalt.mockResolvedValue('salt');
            bcrypt.hash.mockResolvedValue('hashed-password');
            mockPrisma.costCenter.findUnique.mockResolvedValue({ id: 'cc-1', departmentId: 'dept-1' });

            const createdUser = {
                id: 'user-123',
                name: 'Test User',
                email: 'test@example.com',
                password: 'hashed-password',
                isActive: true
            };
            UserRepository.create.mockResolvedValue(createdUser);

            // ACT
            const result = await UserService.createUser(mockPrisma, validUserData);

            // ASSERT
            expect(bcrypt.genSalt).toHaveBeenCalledWith(10);
            expect(bcrypt.hash).toHaveBeenCalledWith('12345678@aA', 'salt');
            expect(UserRepository.create).toHaveBeenCalledWith(mockPrisma, expect.objectContaining({
                password: 'hashed-password',
                isActive: true
            }));
            expect(result.password).toBeUndefined(); // Password removed from response
            expect(result.email).toBe('test@example.com');
        });

        it('should throw 409 error if email already exists', async () => {
            // ARRANGE
            UserRepository.findByEmail.mockResolvedValue({ id: 'existing-user' });

            // ACT & ASSERT
            await expect(UserService.createUser(mockPrisma, validUserData))
                .rejects
                .toEqual(expect.objectContaining({
                    statusCode: 409,
                    message: expect.stringContaining('já cadastrado')
                }));
        });

        it('should resolve departmentId from costCenter if provided', async () => {
            // ARRANGE
            UserRepository.findByEmail.mockResolvedValue(null);
            bcrypt.genSalt.mockResolvedValue('salt');
            bcrypt.hash.mockResolvedValue('hashed-password');
            mockPrisma.costCenter.findUnique.mockResolvedValue({
                id: 'cc-1',
                departmentId: 'resolved-dept-id'
            });
            UserRepository.create.mockResolvedValue({ id: 'user-1', ...validUserData });

            // ACT
            await UserService.createUser(mockPrisma, validUserData);

            // ASSERT
            expect(UserRepository.create).toHaveBeenCalledWith(mockPrisma, expect.objectContaining({
                departmentId: 'resolved-dept-id',
                costCenterId: 'cc-1'
            }));
        });

        it('should create audit log after user creation', async () => {
            // ARRANGE
            UserRepository.findByEmail.mockResolvedValue(null);
            bcrypt.genSalt.mockResolvedValue('salt');
            bcrypt.hash.mockResolvedValue('hashed-password');
            UserRepository.create.mockResolvedValue({ id: 'user-123', email: 'test@example.com' });

            // ACT
            await UserService.createUser(mockPrisma, validUserData);

            // ASSERT
            expect(AuditLogRepository.create).toHaveBeenCalledWith(mockPrisma, expect.objectContaining({
                action: 'criou usuário',
                module: 'CONFIG',
                entityType: 'USER',
                entityId: 'user-123'
            }));
        });
    });

    describe('update', () => {
        it('should hash new password when provided', async () => {
            // ARRANGE
            bcrypt.genSalt.mockResolvedValue('salt');
            bcrypt.hash.mockResolvedValue('new-hashed-password');
            UserRepository.update.mockResolvedValue({ id: 'user-1', name: 'Updated' });

            // ACT
            await UserService.update(mockPrisma, 'user-1', { password: '12345678@aA' });

            // ASSERT
            expect(bcrypt.hash).toHaveBeenCalledWith('12345678@aA', 'salt');
            expect(UserRepository.update).toHaveBeenCalledWith(mockPrisma, 'user-1', expect.objectContaining({
                password: 'new-hashed-password'
            }));
        });

        it('should resolve departmentId when costCenterId changes', async () => {
            // ARRANGE
            mockPrisma.costCenter.findUnique.mockResolvedValue({
                id: 'new-cc',
                departmentId: 'new-dept'
            });
            UserRepository.update.mockResolvedValue({ id: 'user-1' });

            // ACT
            await UserService.update(mockPrisma, 'user-1', { costCenterId: 'new-cc' });

            // ASSERT
            expect(UserRepository.update).toHaveBeenCalledWith(mockPrisma, 'user-1', expect.objectContaining({
                departmentId: 'new-dept',
                costCenterId: 'new-cc'
            }));
        });
    });

    describe('toggleStatus', () => {
        it('should toggle isActive from true to false', async () => {
            // ARRANGE
            UserRepository.findById.mockResolvedValue({ id: 'user-1', isActive: true });
            UserRepository.update.mockResolvedValue({ id: 'user-1', isActive: false });

            // ACT
            const result = await UserService.toggleStatus(mockPrisma, 'user-1');

            // ASSERT
            expect(UserRepository.update).toHaveBeenCalledWith(mockPrisma, 'user-1', { isActive: false });
        });

        it('should toggle isActive from false to true', async () => {
            // ARRANGE
            UserRepository.findById.mockResolvedValue({ id: 'user-1', isActive: false });
            UserRepository.update.mockResolvedValue({ id: 'user-1', isActive: true });

            // ACT
            await UserService.toggleStatus(mockPrisma, 'user-1');

            // ASSERT
            expect(UserRepository.update).toHaveBeenCalledWith(mockPrisma, 'user-1', { isActive: true });
        });

        it('should throw 404 if user not found', async () => {
            // ARRANGE
            UserRepository.findById.mockResolvedValue(null);

            // ACT & ASSERT
            await expect(UserService.toggleStatus(mockPrisma, 'nonexistent'))
                .rejects
                .toEqual(expect.objectContaining({
                    statusCode: 404,
                    message: expect.stringContaining('não encontrado')
                }));
        });
    });

    describe('importUsers', () => {
        it('should count created, updated, and errors correctly', async () => {
            // ARRANGE
            const usersData = [
                { name: 'New User', email: 'new@example.com', azureId: 'azure-1' },
                { name: 'Existing User', email: 'existing@example.com', azureId: 'azure-2' },
                { name: 'Error User', email: 'error@example.com', azureId: 'azure-3' }
            ];

            UserRepository.findByEmail
                .mockResolvedValueOnce(null) // new user
                .mockResolvedValueOnce({ id: 'user-2' }) // existing user
                .mockResolvedValueOnce(null); // error user

            UserRepository.create
                .mockResolvedValueOnce({ id: 'user-1' })
                .mockRejectedValueOnce(new Error('DB Error')); // Third user fails

            UserRepository.update.mockResolvedValue({ id: 'user-2' });

            // ACT
            const result = await UserService.importUsers(mockPrisma, usersData);

            // ASSERT
            expect(result.total).toBe(3);
            expect(result.created).toBe(1);
            expect(result.updated).toBe(1);
            expect(result.errors).toBe(1);
        });
    });

    describe('findAll', () => {
        it('should return all users', async () => {
            UserRepository.findAll.mockResolvedValue([{ id: 'u1', name: 'User 1' }]);

            const result = await UserService.findAll(mockPrisma);
            expect(result).toEqual([{ id: 'u1', name: 'User 1' }]);
        });
    });

    describe('delete', () => {
        it('should delete user', async () => {
            UserRepository.findById.mockResolvedValue({ id: 'u1', name: 'User' });
            UserRepository.delete.mockResolvedValue({ id: 'u1' });

            const result = await UserService.delete(mockPrisma, 'u1');
            expect(UserRepository.delete).toHaveBeenCalledWith(mockPrisma, 'u1');
        });
    });
});
