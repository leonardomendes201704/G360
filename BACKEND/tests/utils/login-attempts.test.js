const {
    MAX_ATTEMPTS,
    LOCK_DURATION_MINUTES,
    recordFailedAttempt,
    checkIfLocked,
    clearAttempts,
    getRemainingAttempts
} = require('../../src/utils/login-attempts');

describe('Login Attempts', () => {
    let prisma;

    beforeEach(() => {
        prisma = {
            loginAttempt: {
                findUnique: jest.fn(),
                create: jest.fn(),
                update: jest.fn(),
                delete: jest.fn(),
                deleteMany: jest.fn()
            }
        };
    });

    describe('recordFailedAttempt', () => {
        it('should create new record on first attempt', async () => {
            prisma.loginAttempt.findUnique.mockResolvedValue(null);
            prisma.loginAttempt.create.mockResolvedValue({
                attempts: 1, lockedUntil: null
            });

            const result = await recordFailedAttempt(prisma, 'Test@Example.com');
            expect(result.locked).toBe(false);
            expect(result.remainingAttempts).toBe(MAX_ATTEMPTS - 1);
            expect(prisma.loginAttempt.create).toHaveBeenCalledWith(
                expect.objectContaining({ data: expect.objectContaining({ email: 'test@example.com' }) })
            );
        });

        it('should increment attempts on existing record', async () => {
            prisma.loginAttempt.findUnique.mockResolvedValue({
                email: 'test@example.com', attempts: 2, lockedUntil: null, firstAttempt: new Date()
            });
            prisma.loginAttempt.update.mockResolvedValue({
                attempts: 3, lockedUntil: null
            });

            const result = await recordFailedAttempt(prisma, 'test@example.com');
            expect(result.locked).toBe(false);
            expect(result.remainingAttempts).toBe(MAX_ATTEMPTS - 3);
        });

        it('should lock after max attempts', async () => {
            prisma.loginAttempt.findUnique.mockResolvedValue({
                email: 'test@example.com', attempts: MAX_ATTEMPTS - 1, lockedUntil: null, firstAttempt: new Date()
            });
            const future = new Date(Date.now() + LOCK_DURATION_MINUTES * 60 * 1000);
            prisma.loginAttempt.update.mockResolvedValue({
                attempts: MAX_ATTEMPTS, lockedUntil: future
            });

            const result = await recordFailedAttempt(prisma, 'test@example.com');
            expect(result.locked).toBe(true);
            expect(result.remainingAttempts).toBe(0);
        });

        it('should reset expired lock', async () => {
            const past = new Date(Date.now() - 1000);
            prisma.loginAttempt.findUnique.mockResolvedValue({
                email: 'test@example.com', attempts: 5, lockedUntil: past, firstAttempt: new Date()
            });
            prisma.loginAttempt.update.mockResolvedValue({
                attempts: 1, lockedUntil: null
            });

            const result = await recordFailedAttempt(prisma, 'test@example.com');
            expect(result.locked).toBe(false);
            expect(result.remainingAttempts).toBe(MAX_ATTEMPTS - 1);
        });
    });

    describe('checkIfLocked', () => {
        it('should return not locked for no record', async () => {
            prisma.loginAttempt.findUnique.mockResolvedValue(null);
            const result = await checkIfLocked(prisma, 'test@example.com');
            expect(result.locked).toBe(false);
        });

        it('should return locked for active lock', async () => {
            const future = new Date(Date.now() + 5 * 60 * 1000);
            prisma.loginAttempt.findUnique.mockResolvedValue({
                email: 'test@example.com', lockedUntil: future
            });

            const result = await checkIfLocked(prisma, 'test@example.com');
            expect(result.locked).toBe(true);
            expect(result.remainingMinutes).toBeGreaterThan(0);
        });

        it('should clear expired lock', async () => {
            const past = new Date(Date.now() - 1000);
            prisma.loginAttempt.findUnique.mockResolvedValue({
                email: 'test@example.com', lockedUntil: past
            });

            const result = await checkIfLocked(prisma, 'test@example.com');
            expect(result.locked).toBe(false);
            expect(prisma.loginAttempt.delete).toHaveBeenCalled();
        });

        it('should return not locked if no lockedUntil', async () => {
            prisma.loginAttempt.findUnique.mockResolvedValue({
                email: 'test@example.com', lockedUntil: null
            });
            const result = await checkIfLocked(prisma, 'test@example.com');
            expect(result.locked).toBe(false);
        });
    });

    describe('clearAttempts', () => {
        it('should delete attempt record', async () => {
            await clearAttempts(prisma, 'Test@Example.com');
            expect(prisma.loginAttempt.deleteMany).toHaveBeenCalledWith({
                where: { email: 'test@example.com' }
            });
        });
    });

    describe('getRemainingAttempts', () => {
        it('should return max for no record', async () => {
            prisma.loginAttempt.findUnique.mockResolvedValue(null);
            const result = await getRemainingAttempts(prisma, 'test@example.com');
            expect(result).toBe(MAX_ATTEMPTS);
        });

        it('should return remaining count', async () => {
            prisma.loginAttempt.findUnique.mockResolvedValue({ attempts: 3 });
            const result = await getRemainingAttempts(prisma, 'test@example.com');
            expect(result).toBe(MAX_ATTEMPTS - 3);
        });

        it('should return 0 when at max', async () => {
            prisma.loginAttempt.findUnique.mockResolvedValue({ attempts: MAX_ATTEMPTS + 1 });
            const result = await getRemainingAttempts(prisma, 'test@example.com');
            expect(result).toBe(0);
        });
    });
});
