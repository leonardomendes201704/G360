const RefreshTokenService = require('../../src/services/refresh-token.service');
const RefreshTokenRepository = require('../../src/repositories/refresh-token.repository');

jest.mock('../../src/repositories/refresh-token.repository');

jest.mock('../../src/config/logger', () => ({
    info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn()
}));

const mockPrisma = {};

describe('RefreshTokenService', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('generateRefreshToken', () => {
        it('should create and return a new refresh token', async () => {
            const mockToken = 'random_hex_string';
            RefreshTokenRepository.create.mockResolvedValue({ token: mockToken, userId: 1 });

            const req = { get: jest.fn().mockReturnValue('Mozilla'), ip: '127.0.0.1' };

            const result = await RefreshTokenService.generateRefreshToken(mockPrisma, 1, req);

            expect(RefreshTokenRepository.create).toHaveBeenCalledWith(
                mockPrisma,
                expect.objectContaining({
                    userId: 1,
                    userAgent: 'Mozilla',
                    ipAddress: '127.0.0.1'
                })
            );
            expect(result).toBe(mockToken);
        });
    });

    describe('validateRefreshToken', () => {
        it('should throw error if token not found', async () => {
            RefreshTokenRepository.findByToken.mockResolvedValue(null);
            await expect(RefreshTokenService.validateRefreshToken(mockPrisma, 'invalid'))
                .rejects.toThrow('Refresh token inválido');
        });

        it('should throw error if token is revoked', async () => {
            RefreshTokenRepository.findByToken.mockResolvedValue({ isRevoked: true });
            await expect(RefreshTokenService.validateRefreshToken(mockPrisma, 'revoked'))
                .rejects.toThrow('Refresh token foi revogado');
        });

        it('should delete and throw if token is expired', async () => {
            const expiredDate = new Date();
            expiredDate.setDate(expiredDate.getDate() - 1);

            RefreshTokenRepository.findByToken.mockResolvedValue({
                isRevoked: false,
                expiresAt: expiredDate
            });
            RefreshTokenRepository.deleteByToken.mockResolvedValue(true);

            await expect(RefreshTokenService.validateRefreshToken(mockPrisma, 'expired'))
                .rejects.toThrow('Refresh token expirado');

            expect(RefreshTokenRepository.deleteByToken).toHaveBeenCalledWith(mockPrisma, 'expired');
        });

        it('should return user if token is valid', async () => {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 1);

            const mockUser = { id: 1, email: 'test@test.com' };
            RefreshTokenRepository.findByToken.mockResolvedValue({
                isRevoked: false,
                expiresAt: futureDate,
                user: mockUser
            });

            const result = await RefreshTokenService.validateRefreshToken(mockPrisma, 'valid');
            expect(result).toEqual(mockUser);
        });
    });

    describe('revokeRefreshToken', () => {
        it('should update token to revoked status', async () => {
            RefreshTokenRepository.findByToken.mockResolvedValue({ token: 'abc' });
            RefreshTokenRepository.revoke.mockResolvedValue(true);

            await RefreshTokenService.revokeRefreshToken(mockPrisma, 'abc');

            expect(RefreshTokenRepository.revoke).toHaveBeenCalledWith(mockPrisma, 'abc');
        });

        it('should throw if token not found', async () => {
            RefreshTokenRepository.findByToken.mockResolvedValue(null);

            await expect(RefreshTokenService.revokeRefreshToken(mockPrisma, 'missing'))
                .rejects.toThrow('Refresh token não encontrado');
        });
    });

    describe('revokeAllUserTokens', () => {
        it('should revoke all tokens for a user', async () => {
            RefreshTokenRepository.revokeAllByUser.mockResolvedValue(true);

            await RefreshTokenService.revokeAllUserTokens(mockPrisma, 99);

            expect(RefreshTokenRepository.revokeAllByUser).toHaveBeenCalledWith(mockPrisma, 99);
        });
    });

    describe('cleanupExpiredTokens', () => {
        it('should delete expired tokens', async () => {
            RefreshTokenRepository.deleteExpired.mockResolvedValue({ count: 10 });

            const count = await RefreshTokenService.cleanupExpiredTokens(mockPrisma);

            expect(count).toBe(10);
            expect(RefreshTokenRepository.deleteExpired).toHaveBeenCalledWith(mockPrisma);
        });
    });
});
