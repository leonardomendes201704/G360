const RoleRepository = require('../repositories/role.repository');
const AuditLogRepository = require('../repositories/audit-log.repository');

class RoleService {
    static async create(prisma, data) {
        // Basic validation could go here
        const role = await RoleRepository.create(prisma, data);

        try {
            await AuditLogRepository.create(prisma, {
                userId: 'system',
                action: 'criou perfil',
                module: 'CONFIG',
                entityId: role.id,
                entityType: 'ROLE',
                newData: role
            });
        } catch (e) { }

        return role;
    }

    static async getAll(prisma) {
        return RoleRepository.findAll(prisma);
    }

    static async getById(prisma, id) {
        const role = await RoleRepository.findById(prisma, id);
        if (!role) throw new Error('Perfil não encontrado');
        return role;
    }

    static async update(prisma, id, data) {
        await this.getById(prisma, id);
        const updated = await RoleRepository.update(prisma, id, data);

        try {
            await AuditLogRepository.create(prisma, {
                userId: 'system',
                action: 'atualizou perfil',
                module: 'CONFIG',
                entityId: id,
                entityType: 'ROLE',
                newData: updated
            });
        } catch (e) { }

        return updated;
    }

    static async delete(prisma, id) {
        await this.getById(prisma, id);
        const result = await RoleRepository.delete(prisma, id);

        try {
            await AuditLogRepository.create(prisma, {
                userId: 'system',
                action: 'excluiu perfil',
                module: 'CONFIG',
                entityId: id,
                entityType: 'ROLE'
            });
        } catch (e) { }

        return result;
    }
}

module.exports = RoleService;
