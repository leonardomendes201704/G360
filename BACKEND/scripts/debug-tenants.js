/**
 * Lista **todos** os tenants no catálogo (`public.tenants`), incluindo inativos.
 * Útil para diagnosticar login "Empresa X não encontrada" (slug inexistente vs is_active = false).
 *
 * Uso: na pasta BACKEND, com DATABASE_URL no .env **ou** Postgres Docker em 127.0.0.1:5433 (valores do docker-compose).
 *
 *   node scripts/debug-tenants.js
 *   npm run catalog:tenants
 */
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { PrismaClient } = require('@prisma/client');

const FALLBACK_URL =
    'postgresql://g360_dev:G360localDev2026@127.0.0.1:5433/g360?schema=public';

function catalogUrl() {
    const raw = process.env.DATABASE_URL || FALLBACK_URL;
    const base = raw.replace(/\?schema=[^&]*/, '').replace(/&schema=[^&]*/, '');
    const sep = base.includes('?') ? '&' : '?';
    return `${base}${sep}schema=public`;
}

(async () => {
    try {
        const url = catalogUrl();
        const masked = url.replace(/:([^:@]+)@/, ':****@');
        console.log('--- Catálogo (public.tenants) ---');
        console.log('DATABASE_URL (mascarada):', masked);

        const prisma = new PrismaClient({
            datasources: { db: { url } },
        });

        const rows = await prisma.$queryRaw`
      SELECT id, name, slug, schema_name AS "schemaName", is_active AS "isActive", plan, created_at AS "createdAt"
      FROM tenants
      ORDER BY slug
    `;

        console.log('\nTotal:', rows.length);
        console.log(JSON.stringify(rows, null, 2));

        const dev = rows.find((r) => r.slug === 'devcraft');
        console.log('\n--- devcraft ---');
        if (!dev) {
            console.log('Não existe linha com slug "devcraft". Correr: npm run seed:devcraft (ou dentro do container: docker compose exec backend npm run seed:devcraft)');
        } else if (!dev.isActive) {
            console.log('Existe mas is_active = false. Reativar no catálogo ou via super-admin.');
        } else {
            console.log('OK: presente e ativo. schema:', dev.schemaName);
        }

        await prisma.$disconnect();
    } catch (e) {
        console.error('ERRO:', e.message);
        if (String(e.message).includes("Can't reach database")) {
            console.error('\nDica: Postgres a correr? (Docker: docker compose up -d g360-postgres)\nDica: BACKEND/.env com DATABASE_URL=...@127.0.0.1:5433/...');
        }
        process.exit(1);
    }
})();
