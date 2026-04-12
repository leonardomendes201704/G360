/**
 * Database Connection Manager
 * 
 * Multi-Tenant: usa TenantManager para gerenciar PrismaClients por schema.
 * Backward Compatibility: exporta `prisma` como default client (schema original).
 * 
 * IMPORTANTE: Em código novo, prefira usar `req.prisma` injetado pelo
 * tenant-resolver middleware. O export `prisma` global será removido
 * futuramente após a refatoração completa.
 */
const TenantManager = require('./tenant-manager');

// Default client (usa DATABASE_URL original, normalmente schema=public)
// Mantido para backward compatibility durante a migração
const prisma = TenantManager.getDefaultClient();

module.exports = { prisma, TenantManager };