class SupportGroupRepository {
    static async create(prisma, data) {
        return prisma.supportGroup.create({
            data,
            include: {
                manager: { select: { id: true, name: true, email: true } },
                members: {
                    include: { user: { select: { id: true, name: true, email: true, avatar: true } } }
                }
            }
        });
    }

    static async findAll(prisma, activeOnly = false) {
        const where = activeOnly ? { isActive: true } : {};
        return prisma.supportGroup.findMany({
            where,
            include: {
                manager: { select: { id: true, name: true, email: true } },
                members: {
                    include: { user: { select: { id: true, name: true, email: true, avatar: true } } }
                },
                _count: { select: { tickets: true, ticketTypes: true } }
            },
            orderBy: { name: 'asc' }
        });
    }

    static async findById(prisma, id) {
        return prisma.supportGroup.findUnique({
            where: { id },
            include: {
                manager: { select: { id: true, name: true, email: true, avatar: true } },
                members: {
                    include: { user: { select: { id: true, name: true, email: true, avatar: true } } }
                },
                _count: { select: { tickets: true, ticketTypes: true } }
            }
        });
    }

    static async update(prisma, id, data) {
        return prisma.supportGroup.update({
            where: { id },
            data,
            include: {
                manager: { select: { id: true, name: true, email: true } },
                members: {
                    include: { user: { select: { id: true, name: true, email: true, avatar: true } } }
                }
            }
        });
    }

    static async delete(prisma, id) {
        return prisma.supportGroup.delete({ where: { id } });
    }

    // --- MEMBERS ---
    static async addMember(prisma, groupId, userId, role = 'ANALYST') {
        return prisma.supportGroupMember.create({
            data: { groupId, userId, role },
            include: { user: { select: { id: true, name: true, email: true, avatar: true } } }
        });
    }

    static async removeMember(prisma, groupId, userId) {
        return prisma.supportGroupMember.delete({
            where: { groupId_userId: { groupId, userId } }
        });
    }

    static async getMembers(prisma, groupId) {
        return prisma.supportGroupMember.findMany({
            where: { groupId },
            include: { user: { select: { id: true, name: true, email: true, avatar: true } } }
        });
    }
}

module.exports = SupportGroupRepository;
