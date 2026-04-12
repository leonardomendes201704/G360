const RefreshTokenRepository = require('../repositories/refresh-token.repository');
const crypto = require('crypto');

class RefreshTokenService {
    // Gerar novo refresh token
    static async generateRefreshToken(prisma, userId, req) {
        const token = crypto.randomBytes(64).toString('hex');
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 dias

        const refreshToken = await RefreshTokenRepository.create(prisma, {
            token,
            userId,
            expiresAt,
            userAgent: req.get('user-agent') || null,
            ipAddress: req.ip || req.connection.remoteAddress
        });

        return refreshToken.token;
    }

    // Validar refresh token
    static async validateRefreshToken(prisma, token) {
        const refreshToken = await RefreshTokenRepository.findByToken(prisma, token);

        if (!refreshToken) {
            throw new Error('Refresh token inválido');
        }

        if (refreshToken.isRevoked) {
            throw new Error('Refresh token foi revogado');
        }

        if (new Date() > refreshToken.expiresAt) {
            await RefreshTokenRepository.deleteByToken(prisma, token);
            throw new Error('Refresh token expirado');
        }

        return refreshToken.user;
    }

    // Revogar refresh token (logout)
    static async revokeRefreshToken(prisma, token) {
        const refreshToken = await RefreshTokenRepository.findByToken(prisma, token);

        if (!refreshToken) {
            throw new Error('Refresh token não encontrado');
        }

        await RefreshTokenRepository.revoke(prisma, token);
        return true;
    }

    // Revogar todos os tokens de um usuário
    static async revokeAllUserTokens(prisma, userId) {
        await RefreshTokenRepository.revokeAllByUser(prisma, userId);
        return true;
    }

    // Limpar tokens expirados (cron job)
    static async cleanupExpiredTokens(prisma) {
        const result = await RefreshTokenRepository.deleteExpired(prisma);
        return result.count;
    }
}

module.exports = RefreshTokenService;
