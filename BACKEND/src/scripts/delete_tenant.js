const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const TENANT_SLUG = process.argv[2];

if (!TENANT_SLUG) {
    console.error('❌ Please provide a tenant slug.');
    console.log('Usage: node delete_tenant.js <tenant_slug>');
    process.exit(1);
}

const CATALOG_SCHEMA = 'public';
const TENANT_SCHEMA = `tenant_${TENANT_SLUG}`;

const catalogDbUrl = process.env.DATABASE_URL.replace(/\?schema=[^&]*/, `?schema=${CATALOG_SCHEMA}`);
const catalogPrisma = new PrismaClient({ datasources: { db: { url: catalogDbUrl } } });

async function main() {
    console.log(`🗑️  Starting deletion for Tenant: ${TENANT_SLUG}...`);

    try {
        console.log(`🔍 Checking tenant in catalog...`);

        const existing = await catalogPrisma.$queryRaw`
            SELECT * FROM tenants WHERE slug = ${TENANT_SLUG} LIMIT 1
        `;

        if (existing.length > 0) {
            console.log(`✅ Tenant found. Deleting from catalog...`);
            await catalogPrisma.$executeRaw`
                DELETE FROM tenants WHERE slug = ${TENANT_SLUG}
            `;
            console.log(`✅ Tenant '${TENANT_SLUG}' removed from catalog.`);
        } else {
            console.log(`⚠️  Tenant '${TENANT_SLUG}' not found in catalog.`);
        }

        console.log(`🗑️  Dropping schema '${TENANT_SCHEMA}'...`);
        // Use executeRawUnsafe because schema name is dynamic and cannot be parameterized in executeRaw
        await catalogPrisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${TENANT_SCHEMA}" CASCADE`);
        console.log(`✅ Schema '${TENANT_SCHEMA}' dropped successfully.`);

    } catch (error) {
        console.error('❌ Error executing deletion:', error);
        process.exit(1);
    } finally {
        await catalogPrisma.$disconnect();
    }
}

main();
