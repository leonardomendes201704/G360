const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const logger = require('../config/logger');

/** Chave por utilizador autenticado (JWT) quando possível; senão IP. */
function globalRateLimitKey(req) {
  const auth = req.headers?.authorization;
  if (auth && auth.startsWith('Bearer ') && process.env.JWT_SECRET) {
    try {
      const token = auth.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
      const uid = decoded.userId || decoded.id;
      if (uid) return `uid:${uid}`;
    } catch (_) {
      /* token inválido — cai no IP */
    }
  }
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

// Rate Limiter para Login - Proteção contra Brute Force
// Usar apenas email para evitar problema com IPv6
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: process.env.RATE_LIMIT_BYPASS === 'true' ? 1000000 : (process.env.NODE_ENV === 'production' ? 5 : 100), // 5 em prod, 100 em dev/test
    message: {
        error: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
        retryAfter: '15 minutos'
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Usar apenas email como chave (evita problema IPv6)
    keyGenerator: (req) => {
        return req.body?.email || 'anonymous';
    },
    // Log quando usuário é bloqueado
    handler: (req, res) => {
        logger.warn('[RATE LIMIT]', {
            timestamp: new Date(),
            email: req.body?.email || 'anonymous',
            message: 'Login rate limit exceeded'
        });
        res.status(429).json({
            error: 'Muitas tentativas de login',
            message: 'Você excedeu o limite de tentativas. Aguarde 15 minutos ou solicite reset de senha.',
            retryAfter: 900 // segundos (15 min)
        });
    }
});

// Rate Limiter Global para todas as APIs - Proteção contra DDoS/Abuso
const globalLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minuto
    max: process.env.RATE_LIMIT_BYPASS === 'true' ? 1000000 : 200, // 200 requests por minuto por IP (aumentado para usuários autenticados)
    message: {
        error: 'Muitas requisições. Aguarde um momento.',
        retryAfter: '1 minuto'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: globalRateLimitKey,
    // Pula rate limit para requisições GET de health check
    skip: (req) => req.path === '/api/health' && req.method === 'GET'
});

// Rate Limiter para Reference APIs - Endpoints leves que retornam apenas {id, name}
const referenceLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minuto
    max: process.env.RATE_LIMIT_BYPASS === 'true' ? 1000000 : 300, // 300 requests por minuto (endpoints seguros e leves)
    message: {
        error: 'Muitas requisições para dados de referência. Aguarde um momento.',
        retryAfter: '1 minuto'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Rate Limiter para APIs sensíveis (criação/deleção de dados)
const strictLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minuto
    max: process.env.RATE_LIMIT_BYPASS === 'true' ? 1000000 : 20, // 20 requests por minuto
    message: {
        error: 'Muitas requisições para esta operação. Aguarde um momento.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

module.exports = {
    loginLimiter,
    globalLimiter,
    strictLimiter,
    referenceLimiter
};
