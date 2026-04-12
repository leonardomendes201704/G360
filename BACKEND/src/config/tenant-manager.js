/**
 * TenantManager — Gerenciador central de PrismaClients para Multi-Tenant
 * 
 * Mantém um pool de PrismaClients com LRU cache.
 * Cada tenant (schema) tem seu próprio PrismaClient isolado.
 * 
 * Limites:
 *  - Máximo de 30 clients simultâneos (configurável via MAX_TENANT_CLIENTS)
 *  - Cada client usa connection_limit de 3
 *  - Clients inativos por >30min são desconectados automaticamente
 */

const { PrismaClient } = require('@prisma/client');
const logger = require('./logger');

// --- Configuração ---
const MAX_CLIENTS = parseInt(process.env.MAX_TENANT_CLIENTS || '30', 10);
const CONNECTION_LIMIT = parseInt(process.env.TENANT_CONNECTION_LIMIT || '3', 10);
const IDLE_TIMEOUT_MS = parseInt(process.env.TENANT_IDLE_TIMEOUT_MS || '1800000', 10); // 30 min
const CLEANUP_INTERVAL_MS = 60000; // 1 min

// --- Pool de Clients ---
const clientPool = new Map(); // schemaName -> { client, lastUsed }

// --- URL Base ---
function getBaseUrl() {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL não configurada');
    // Remove o parâmetro schema existente, se houver
    return url.replace(/\?schema=[^&]*/, '').replace(/&schema=[^&]*/, '');
}

function buildUrlForSchema(schemaName) {
    const baseUrl = getBaseUrl();
    const separator = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${separator}schema=${schemaName}`;
}

// --- Client para o Catálogo (schema public) ---
let catalogClient = null;

function getCatalogClient() {
    if (!catalogClient) {
        const url = buildUrlForSchema('public');
        catalogClient = new PrismaClient({
            datasources: { db: { url } },
            log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
        });
        logger.info('[TenantManager] Catalog client (schema: public) initialized');
    }
    return catalogClient;
}

// --- Client para Schema do Tenant ---
function getClientForTenant(schemaName) {
    if (!schemaName) {
        throw new Error('[TenantManager] schemaName é obrigatório');
    }

    const entry = clientPool.get(schemaName);

    if (entry) {
        entry.lastUsed = Date.now();
        return entry.client;
    }

    // Checar limite do pool
    if (clientPool.size >= MAX_CLIENTS) {
        evictLeastRecentlyUsed();
    }

    // Criar novo client
    const url = buildUrlForSchema(schemaName);
    const client = new PrismaClient({
        datasources: { db: { url } },
        log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    });

    clientPool.set(schemaName, {
        client,
        lastUsed: Date.now(),
    });

    logger.info(`[TenantManager] New client created for schema: ${schemaName} (pool: ${clientPool.size}/${MAX_CLIENTS})`);
    return client;
}

// --- Client padrão (backward compatibility) ---
// Usa o schema da DATABASE_URL original (normalmente "public")
let defaultClient = null;

function getDefaultClient() {
    if (!defaultClient) {
        defaultClient = new PrismaClient({
            log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
        });
        logger.info('[TenantManager] Default client initialized');
    }
    return defaultClient;
}

// --- Evict: remover o client menos utilizado ---
function evictLeastRecentlyUsed() {
    let oldestKey = null;
    let oldestTime = Infinity;

    for (const [key, entry] of clientPool) {
        if (entry.lastUsed < oldestTime) {
            oldestTime = entry.lastUsed;
            oldestKey = key;
        }
    }

    if (oldestKey) {
        evictClient(oldestKey);
    }
}

// --- Evict: desconectar um client específico ---
async function evictClient(schemaName) {
    const entry = clientPool.get(schemaName);
    if (entry) {
        try {
            await entry.client.$disconnect();
        } catch (e) {
            logger.warn(`[TenantManager] Error disconnecting client for ${schemaName}:`, e.message);
        }
        clientPool.delete(schemaName);
        logger.info(`[TenantManager] Client evicted for schema: ${schemaName} (pool: ${clientPool.size}/${MAX_CLIENTS})`);
    }
}

// --- Cleanup: desconectar clients inativos ---
async function cleanupIdleClients() {
    const now = Date.now();
    const toEvict = [];

    for (const [key, entry] of clientPool) {
        if (now - entry.lastUsed > IDLE_TIMEOUT_MS) {
            toEvict.push(key);
        }
    }

    for (const key of toEvict) {
        await evictClient(key);
    }

    if (toEvict.length > 0) {
        logger.info(`[TenantManager] Cleanup: evicted ${toEvict.length} idle clients`);
    }
}

// --- Buscar todos os tenants ativos (para cron jobs) ---
async function getAllActiveTenants() {
    const catalog = getCatalogClient();
    try {
        // Query raw pois o catalog client usa o schema public
        const tenants = await catalog.$queryRaw`
      SELECT id, name, slug, schema_name as "schemaName", is_active as "isActive"
      FROM tenants
      WHERE is_active = true
    `;
        return tenants;
    } catch (error) {
        logger.error('[TenantManager] Error fetching active tenants:', error.message);
        return [];
    }
}

// --- Buscar tenant pelo slug ---
async function getTenantBySlug(slug) {
    const catalog = getCatalogClient();
    try {
        const tenants = await catalog.$queryRaw`
      SELECT id, name, slug, schema_name as "schemaName", is_active as "isActive",
             plan, max_users as "maxUsers", enabled_modules as "enabledModules"
      FROM tenants
      WHERE slug = ${slug} AND is_active = true
      LIMIT 1
    `;
        return tenants.length > 0 ? tenants[0] : null;
    } catch (error) {
        logger.error(`[TenantManager] Error fetching tenant ${slug}:`, error.message);
        return null;
    }
}

// --- Pool Stats (para monitoramento) ---
function getPoolStats() {
    const uptimeSeconds = Math.floor(process.uptime());
    const hours = Math.floor(uptimeSeconds / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
    const uptime = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

    return {
        size: clientPool.size,
        activeClients: clientPool.size,
        maxClients: MAX_CLIENTS,
        uptime,
        clients: Array.from(clientPool.entries()).map(([key, entry]) => ({
            schema: key,
            lastUsed: new Date(entry.lastUsed).toISOString(),
            idleMs: Date.now() - entry.lastUsed,
        })),
    };
}

// --- Disconnect All (para graceful shutdown) ---
async function disconnectAll() {
    logger.info('[TenantManager] Disconnecting all clients...');

    for (const [key] of clientPool) {
        await evictClient(key);
    }

    if (catalogClient) {
        await catalogClient.$disconnect();
        catalogClient = null;
    }

    if (defaultClient) {
        await defaultClient.$disconnect();
        defaultClient = null;
    }

    logger.info('[TenantManager] All clients disconnected');
}

// --- Iniciar cleanup periódico ---
let cleanupInterval = null;

function startCleanupInterval() {
    if (!cleanupInterval) {
        cleanupInterval = setInterval(cleanupIdleClients, CLEANUP_INTERVAL_MS);
        // Não impedir o processo Node de encerrar
        if (cleanupInterval.unref) cleanupInterval.unref();
        logger.info(`[TenantManager] Cleanup interval started (every ${CLEANUP_INTERVAL_MS / 1000}s)`);
    }
}

function stopCleanupInterval() {
    if (cleanupInterval) {
        clearInterval(cleanupInterval);
        cleanupInterval = null;
    }
}

// Iniciar cleanup automaticamente
startCleanupInterval();

module.exports = {
    getCatalogClient,
    getClientForTenant,
    getDefaultClient,
    evictClient,
    getAllActiveTenants,
    getTenantBySlug,
    getPoolStats,
    disconnectAll,
    startCleanupInterval,
    stopCleanupInterval,
};
