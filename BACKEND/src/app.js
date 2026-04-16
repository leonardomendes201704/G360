const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const multer = require('multer');
const path = require('path'); // Import necessário
require('dotenv').config();
require('express-async-errors');

const routes = require('./routes');
const { tenantResolver } = require('./middlewares/tenant-resolver.middleware');
const TenantManager = require('./config/tenant-manager');

// Helmet Configuration - Security Headers
const app = express();

// [PATCH] Redirect for legacy email links — alinhado à porta predefinida do Vite G360 (5176)
// Intercepts requests to /tasks/:id on the backend and redirects to frontend
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5176';
app.get('/tasks/:id', (req, res) => {
  const taskId = req.params.id;
  if (taskId) {
    return res.redirect(301, `${FRONTEND_URL}/tasks/${taskId}`);
  }
  next();
});

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // MUI requer inline styles
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'self'"], // Permitir iframes do próprio servidor (para PDFs)
      frameAncestors: ["'self'", "http://localhost:*", "https://localhost:*", "http://10.*:*", "http://192.168.*:*", "http://172.16.*:*"], // Permitir ser embutido em rede local
    },
  },
  hsts: {
    maxAge: 31536000, // 1 ano
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  xssFilter: true,
  hidePoweredBy: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));

// Headers Adicionais de Segurança (Permissions-Policy)
app.use((req, res, next) => {
  res.setHeader('Permissions-Policy',
    'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=()'
  );
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  next();
});

// CORS Configuration - Security Enhancement
const configureCORS = () => {
  return cors({
    origin: function (origin, callback) {
      // Permitir requests sem origin (Postman, mobile apps, curl, etc)
      if (!origin) return callback(null, true);

      // Desenvolvimento: aceita localhost e IPs da rede local (qualquer porta)
      if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
        // Regex para localhost e IPs 192.168.x.x, 10.x.x.x, 172.16-31.x.x
        const devPattern = /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2[0-9]|3[0-1])\.\d{1,3}\.\d{1,3})(:\d+)?$/;
        if (devPattern.test(origin)) {
          return callback(null, true);
        }
      }

      // Produção: apenas origens na whitelist
      const allowedOrigins = process.env.ALLOWED_ORIGINS
        ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
        : [];

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // Log de tentativa bloqueada (útil para debug)
      console.warn(`[CORS] Blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Tenant-Slug'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    maxAge: 600 // 10 minutos de cache para preflight
  });
};

app.use(configureCORS());
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// Sanitização global contra XSS — aplica em todos os req.body
const { sanitize } = require('./middlewares/sanitize.middleware');
app.use(sanitize());

app.use(morgan('dev'));

// Rate Limiting Global - Proteção contra DDoS/Abuso (sempre ativo, exceto bypass load test)
const { globalLimiter } = require('./middlewares/rate-limit.middleware');
const { securityLogger } = require('./middlewares/security-logger.middleware');

if (process.env.RATE_LIMIT_BYPASS !== 'true') {
  app.use('/api', globalLimiter);
  app.use('/api', securityLogger);
}

// --- MULTI-TENANT: Tenant Resolver ---
// Injeta req.prisma com o PrismaClient correto para o schema do tenant
app.use('/api', tenantResolver());

// --- SWAGGER / API DOCS (desabilitado em produção) ---
if (process.env.NODE_ENV !== 'production') {
  const swaggerUi = require('swagger-ui-express');
  const swaggerSpec = require('./config/swagger');
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'G360 API Docs'
  }));
  app.get('/api/docs.json', (req, res) => res.json(swaggerSpec));
}

// --- SERVIR ARQUIVOS ESTÁTICOS ---
// Permite que o frontend acesse http://localhost:8500/uploads/...
app.use('/uploads', express.static(path.resolve(__dirname, '..', 'uploads')));

// Rota Health Check aprimorado
const startTime = Date.now();
app.get(['/api/health', '/api/v1/health'], async (req, res) => {
  const health = {
    status: 'healthy',
    version: require('../package.json').version,
    environment: process.env.NODE_ENV || 'development',
    uptime: `${Math.floor((Date.now() - startTime) / 1000)}s`,
    timestamp: new Date().toISOString(),
    dependencies: {}
  };

  // Verificar Database
  try {
    const dbStart = Date.now();
    await require('./config/database').prisma.$queryRaw`SELECT 1`;
    health.dependencies.database = {
      status: 'up',
      latency: `${Date.now() - dbStart}ms`
    };
  } catch (err) {
    health.status = 'degraded';
    health.dependencies.database = { status: 'down', error: err.message };
  }

  // Memória
  const mem = process.memoryUsage();
  health.memory = {
    rss: `${Math.round(mem.rss / 1024 / 1024)}MB`,
    heap: `${Math.round(mem.heapUsed / 1024 / 1024)}/${Math.round(mem.heapTotal / 1024 / 1024)}MB`
  };

  // Multi-Tenant Pool Stats
  health.tenantPool = TenantManager.getPoolStats();

  const statusCode = health.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(health);
});

app.use('/api/v1', routes);

// Header de versão da API
app.use((req, res, next) => {
  res.setHeader('X-API-Version', 'v1');
  next();
});

// 404 handler — retorna JSON ao invés de HTML do Express (LOW-02)
app.use((req, res) => {
  res.status(404).json({ status: 'error', statusCode: 404, message: 'Rota não encontrada.' });
});

const errorHandler = require('./middlewares/error-handler.middleware');
app.use(errorHandler);

const PORT = process.env.PORT || 8500;

const NotificationJob = require('./jobs/notification.job');

// HTTPS Support
const fs = require('fs');
const https = require('https');

// HTTP Server Disabled - HTTPS Required for Mixed Content Fix
/*
app.listen(PORT, '0.0.0.0', () => {
  console.log(`
  🚀 G360 Server running on port ${PORT}
  Network Access Enabled (0.0.0.0)
  Environment: ${process.env.NODE_ENV}
  `);

  // Initialize Scheduler
  NotificationJob.init();

  // Initialize Global Cron Service (Contracts/Licenses)
  const CronService = require('./services/cron.service');
  CronService.init();
});
*/

// HTTPS Server Enabled
if (process.env.NODE_ENV !== 'test') {
  try {
    const certPath = path.join(__dirname, 'certs', 'server.cert');
    const keyPath = path.join(__dirname, 'certs', 'server.key');

    // Bypass HTTPS local e força HTTP para Artillery se for var env DEV_HTTP=true
    if (process.env.DEV_HTTP === 'true') {
        app.listen(PORT, '0.0.0.0', () => {
          console.log(`🚀 G360 Server running on port ${PORT} (Forced HTTP for Load Test)`);
          NotificationJob.init();
          const CronService = require('./services/cron.service');
          CronService.init();
        });
    } else if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
      const httpsOptions = {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath)
      };
      https.createServer(httpsOptions, app).listen(PORT, '0.0.0.0', () => {
        console.log(`
        🚀 G360 HTTPS Server running on port ${PORT}
        Network Access Enabled (0.0.0.0)
        Environment: ${process.env.NODE_ENV}
        `);

        // Initialize Scheduler
        NotificationJob.init();

        // Initialize Global Cron Service (Contracts/Licenses)
        const CronService = require('./services/cron.service');
        CronService.init();
      });
    } else {
      console.log('HTTPS Certs not found, falling back to HTTP.');
      // Fallback to HTTP if certs are missing
      app.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 G360 Server running on port ${PORT} (HTTP Fallback)`);
        NotificationJob.init();
        const CronService = require('./services/cron.service');
        CronService.init();
      });
    }
  } catch (e) {
    console.error('Failed to start HTTPS server:', e);
  }
}

// --- Graceful Shutdown ---
const gracefulShutdown = async (signal) => {
  console.log(`\n[${signal}] Shutting down gracefully...`);
  try {
    await TenantManager.disconnectAll();
    console.log('All database connections closed.');
  } catch (err) {
    console.error('Error during shutdown:', err);
  }
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

module.exports = app;
