class RefreshTokenRepository {
    static async create(prisma, data) {
        return prisma.refreshToken.create({ data });
    }

    static async findByToken(prisma, token) {
        return prisma.refreshToken.findUnique({
            where: { token },
            include: {
                user: {
                    include: {
                        roles: { include: { permissions: true } }
                    }
                }
            }
        });
    }

    static async revoke(prisma, token) {
        return prisma.refreshToken.update({
            where: { token },
            data: { isRevoked: true, revokedAt: new Date() }
        });
    }

    static async revokeAllByUser(prisma, userId) {
        return prisma.refreshToken.updateMany({
            where: { userId, isRevoked: false },
            data: { isRevoked: true, revokedAt: new Date() }
        });
    }

    static async deleteByToken(prisma, token) {
        return prisma.refreshToken.delete({ where: { token } });
    }

    static async deleteExpired(prisma) {
        return prisma.refreshToken.deleteMany({
            where: { expiresAt: { lt: new Date() } }
        });
    }
}

module.exports = RefreshTokenRepository;
