const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class RoleRepository {
    static async create(prisma, data) {
        // data: { name, description, permissions: [{module, action}, ...] }
        return prisma.role.create({
            data: {
                name: data.name,
                description: data.description,
                permissions: {
                    create: data.permissions // Assumes permissions array of { module, action }
                }
            },
            include: { permissions: true }
        });
    }

    static async findAll(prisma) {
        return prisma.role.findMany({
            include: { permissions: true, _count: { select: { users: true } } }
        });
    }

    static async findById(prisma, id) {
        return prisma.role.findUnique({
            where: { id },
            include: { permissions: true }
        });
    }

    static async update(prisma, id, data) {
        // Transaction to update permissions: delete old, create new
        return prisma.$transaction(async (tx) => {
            if (data.permissions) {
                await tx.permission.deleteMany({ where: { roleId: id } });
                await tx.permission.createMany({
                    data: data.permissions.map(p => ({ ...p, roleId: id }))
                });
            }

            return tx.role.update({
                where: { id },
                data: {
                    name: data.name,
                    description: data.description
                },
                include: { permissions: true }
            });
        });
    }

    static async delete(prisma, id) {
        // Permissions cascade delete usually handled by DB, but safe to delete manually if needed
        // Prisma schema typically doesn't cascade Permission on Role delete automatically unless configured.
        // Our schema: role Role @relation(fields: [roleId], references: [id]) -> Default is not cascade?
        // Let's check schema later. For safety, transaction.
        return prisma.$transaction([
            prisma.permission.deleteMany({ where: { roleId: id } }),
            prisma.role.delete({ where: { id } })
        ]);
    }
}

module.exports = RoleRepository;
