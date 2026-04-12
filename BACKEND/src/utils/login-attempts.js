/**
 * Controle de Tentativas de Login - Persistente (Prisma)
 * Armazena tentativas falhas no banco de dados.
 * Sobrevive a restart do servidor (diferente da versão in-memory anterior).
 * 
 * Recebe `prisma` como primeiro parâmetro para suportar multi-tenant.
 */

const MAX_ATTEMPTS = 5;
const LOCK_DURATION_MINUTES = 15;

/**
 * Registra uma tentativa de login falha
 * @param {object} prisma - PrismaClient do tenant
 * @param {string} email - Email do usuário
 * @returns {Promise<{ locked: boolean, remainingAttempts: number, unlockTime: Date | null }>}
 */
async function recordFailedAttempt(prisma, email) {
    const key = email.toLowerCase();
    const now = new Date();

    let record = await prisma.loginAttempt.findUnique({ where: { email: key } });

    // Se estava bloqueado e o tempo expirou, resetar
    if (record && record.lockedUntil && record.lockedUntil <= now) {
        record = await prisma.loginAttempt.update({
            where: { email: key },
            data: { attempts: 1, firstAttempt: now, lockedUntil: null }
        });
    } else if (!record) {
        record = await prisma.loginAttempt.create({
            data: { email: key, attempts: 1, firstAttempt: now }
        });
    } else {
        const newAttempts = record.attempts + 1;
        const lockedUntil = newAttempts >= MAX_ATTEMPTS
            ? new Date(now.getTime() + LOCK_DURATION_MINUTES * 60 * 1000)
            : null;

        record = await prisma.loginAttempt.update({
            where: { email: key },
            data: { attempts: newAttempts, lockedUntil }
        });
    }

    return {
        locked: record.lockedUntil !== null,
        remainingAttempts: Math.max(0, MAX_ATTEMPTS - record.attempts),
        unlockTime: record.lockedUntil || null
    };
}

/**
 * Verifica se um email está bloqueado
 * @param {object} prisma - PrismaClient do tenant
 * @param {string} email - Email do usuário
 * @returns {Promise<{ locked: boolean, unlockTime: Date | null, remainingMinutes: number }>}
 */
async function checkIfLocked(prisma, email) {
    const key = email.toLowerCase();
    const now = new Date();

    const record = await prisma.loginAttempt.findUnique({ where: { email: key } });

    if (!record || !record.lockedUntil) {
        return { locked: false, unlockTime: null, remainingMinutes: 0 };
    }

    if (record.lockedUntil <= now) {
        // Expirou, limpar o registro
        await prisma.loginAttempt.delete({ where: { email: key } });
        return { locked: false, unlockTime: null, remainingMinutes: 0 };
    }

    return {
        locked: true,
        unlockTime: record.lockedUntil,
        remainingMinutes: Math.ceil((record.lockedUntil.getTime() - now.getTime()) / 60000)
    };
}

/**
 * Limpa o registro de tentativas após login bem-sucedido
 * @param {object} prisma - PrismaClient do tenant
 * @param {string} email - Email do usuário
 */
async function clearAttempts(prisma, email) {
    const key = email.toLowerCase();
    await prisma.loginAttempt.deleteMany({ where: { email: key } });
}

/**
 * Obtém o número de tentativas restantes
 * @param {object} prisma - PrismaClient do tenant
 * @param {string} email - Email do usuário
 * @returns {Promise<number>}
 */
async function getRemainingAttempts(prisma, email) {
    const key = email.toLowerCase();
    const record = await prisma.loginAttempt.findUnique({ where: { email: key } });

    if (!record) return MAX_ATTEMPTS;
    return Math.max(0, MAX_ATTEMPTS - record.attempts);
}

module.exports = {
    MAX_ATTEMPTS,
    LOCK_DURATION_MINUTES,
    recordFailedAttempt,
    checkIfLocked,
    clearAttempts,
    getRemainingAttempts
};
