const winston = require('winston');
const path = require('path');
const fs = require('fs');

const LOG_DIR = path.resolve(__dirname, '../../logs');

// Garantir diretório de logs
if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
}

const isDev = process.env.NODE_ENV !== 'production';

// Formato human-readable para development
const devFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
        const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
        return `${timestamp} ${level}: ${message}${metaStr}`;
    })
);

// Formato JSON para produção (facilita ingestão em ELK/Datadog/etc)
const prodFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
);

const logger = winston.createLogger({
    level: isDev ? 'debug' : 'info',
    format: prodFormat,
    defaultMeta: { service: 'g360-backend' },
    transports: [
        // Console — always
        new winston.transports.Console({
            format: isDev ? devFormat : prodFormat
        }),

        // Arquivo geral — info + warn + error
        new winston.transports.File({
            filename: path.join(LOG_DIR, 'app.log'),
            level: 'info',
            maxsize: 5 * 1024 * 1024, // 5MB
            maxFiles: 5,
            tailable: true
        }),

        // Arquivo de erros — apenas error
        new winston.transports.File({
            filename: path.join(LOG_DIR, 'error.log'),
            level: 'error',
            maxsize: 5 * 1024 * 1024,
            maxFiles: 10,
            tailable: true
        }),

        // Arquivo de segurança
        new winston.transports.File({
            filename: path.join(LOG_DIR, 'security.log'),
            level: 'warn',
            maxsize: 5 * 1024 * 1024,
            maxFiles: 10,
            tailable: true
        })
    ],
    // Não encerrar em exceção não tratada
    exitOnError: false
});

// Loggers especializados
logger.security = (message, meta = {}) => {
    logger.warn(message, { category: 'SECURITY', ...meta });
};

logger.cron = (message, meta = {}) => {
    logger.info(message, { category: 'CRON', ...meta });
};

logger.db = (message, meta = {}) => {
    logger.debug(message, { category: 'DATABASE', ...meta });
};

logger.http = (message, meta = {}) => {
    logger.info(message, { category: 'HTTP', ...meta });
};

module.exports = logger;
