const RoleService = require('../../src/services/role.service');
const RoleRepository = require('../../src/repositories/role.repository');
const AuditLogRepository = require('../../src/repositories/audit-log.repository');

// MOCKS
jest.mock('../../src/repositories/role.repository');
jest.mock('../../src/repositories/audit-log.repository');

describe('RoleService', () => {
    const prisma = {};
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('create', () => {
        it('should create role with permissions', async () => {
            const roleData = {
                name: 'Novo Perfil',
                description: 'Descrição do perfil',
                permissions: [
                    { module: 'PROJECTS', action: 'READ' },
                    { module: 'PROJECTS', action: 'WRITE' }
                ]
            };

            RoleRepository.create.mockResolvedValue({ id: 'role-new', ...roleData });
            AuditLogRepository.create.mockResolvedValue({});

            const result = await RoleService.create(prisma, roleData);

            expect(result.id).toBe('role-new');
            expect(RoleRepository.create).toHaveBeenCalledWith(prisma, roleData);
        });

        it('should log audit on creation', async () => {
            RoleRepository.create.mockResolvedValue({ id: 'role-new', name: 'Test' });
            AuditLogRepository.create.mockResolvedValue({});

            await RoleService.create(prisma, { name: 'Test' });

            expect(AuditLogRepository.create).toHaveBeenCalledWith(
                prisma,
                expect.objectContaining({
                    action: 'criou perfil',
                    module: 'CONFIG',
                    entityType: 'ROLE'
                })
            );
        });
    });

    describe('getAll', () => {
        it('should return all roles', async () => {
            const mockRoles = [
                { id: 'role-1', name: 'Admin', permissions: [] },
                { id: 'role-2', name: 'Viewer', permissions: [] }
            ];

            RoleRepository.findAll.mockResolvedValue(mockRoles);

            const result = await RoleService.getAll(prisma);

            expect(result).toHaveLength(2);
            expect(RoleRepository.findAll).toHaveBeenCalledWith(prisma);
        });
    });

    describe('getById', () => {
        it('should return role by ID', async () => {
            RoleRepository.findById.mockResolvedValue({ id: 'role-1', name: 'Admin' });

            const result = await RoleService.getById(prisma, 'role-1');

            expect(result.name).toBe('Admin');
        });

        it('should throw error if role not found', async () => {
            RoleRepository.findById.mockResolvedValue(null);

            await expect(RoleService.getById(prisma, 'invalid-id'))
                .rejects
                .toThrow('Perfil não encontrado');
        });
    });

    describe('update', () => {
        it('should update role', async () => {
            RoleRepository.findById.mockResolvedValue({ id: 'role-1', name: 'Old Name' });
            RoleRepository.update.mockResolvedValue({ id: 'role-1', name: 'New Name' });
            AuditLogRepository.create.mockResolvedValue({});

            const result = await RoleService.update(prisma, 'role-1', { name: 'New Name' });

            expect(result.name).toBe('New Name');
            expect(RoleRepository.update).toHaveBeenCalledWith(prisma, 'role-1', { name: 'New Name' });
        });

        it('should throw error if role not found on update', async () => {
            RoleRepository.findById.mockResolvedValue(null);

            await expect(RoleService.update(prisma, 'invalid-id', { name: 'Test' }))
                .rejects
                .toThrow('Perfil não encontrado');
        });
    });

    describe('delete', () => {
        it('should delete role', async () => {
            RoleRepository.findById.mockResolvedValue({ id: 'role-1', name: 'Test' });
            RoleRepository.delete.mockResolvedValue({ id: 'role-1' });
            AuditLogRepository.create.mockResolvedValue({});

            await RoleService.delete(prisma, 'role-1');

            expect(RoleRepository.delete).toHaveBeenCalledWith(prisma, 'role-1');
        });

        it('should log audit on deletion', async () => {
            RoleRepository.findById.mockResolvedValue({ id: 'role-1', name: 'Test' });
            RoleRepository.delete.mockResolvedValue({ id: 'role-1' });
            AuditLogRepository.create.mockResolvedValue({});

            await RoleService.delete(prisma, 'role-1');

            expect(AuditLogRepository.create).toHaveBeenCalledWith(
                prisma,
                expect.objectContaining({
                    action: 'excluiu perfil',
                    module: 'CONFIG',
                    entityType: 'ROLE'
                })
            );
        });

        it('should throw error if role not found on delete', async () => {
            RoleRepository.findById.mockResolvedValue(null);

            await expect(RoleService.delete(prisma, 'invalid-id'))
                .rejects
                .toThrow('Perfil não encontrado');
        });
    });
});
