/**
 * Script: Reset passwords for all users of a specific tenant
 * 
 * Usage:
 *   node src/scripts/reset_tenant_passwords.js
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const TENANT_SLUG = 'liotecnica';
const NEW_PASSWORD = 'L89*Eb5v@';

function getBaseUrl() {
    const url = process.env.DATABASE_URL;
    return url.replace(/\?schema=[^&]*/, '').replace(/&schema=[^&]*/, '');
}

function buildUrlForSchema(schemaName) {
    const baseUrl = getBaseUrl();
    const separator = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${separator}schema=${schemaName}`;
}

async function main() {
    // 1. Find tenant in catalog (public schema)
    const catalogUrl = buildUrlForSchema('public');
    const catalogPrisma = new PrismaClient({ datasources: { db: { url: catalogUrl } } });

    try {
        console.log(`🔍 Looking for tenant "${TENANT_SLUG}"...`);

        const tenants = await catalogPrisma.$queryRaw`
            SELECT id, name, slug, schema_name FROM tenants WHERE slug = ${TENANT_SLUG}
        `;

        if (tenants.length === 0) {
            console.error(`❌ Tenant "${TENANT_SLUG}" not found in catalog.`);
            process.exit(1);
        }

        const tenant = tenants[0];
        console.log(`✅ Found tenant: "${tenant.name}" (schema: ${tenant.schema_name})`);

        // 2. Connect to tenant schema and update all users
        const tenantUrl = buildUrlForSchema(tenant.schema_name);
        const tenantPrisma = new PrismaClient({ datasources: { db: { url: tenantUrl } } });

        try {
            const users = await tenantPrisma.user.findMany({
                select: { id: true, email: true, name: true }
            });

            if (users.length === 0) {
                console.log('⚠️  No users found in this tenant.');
                return;
            }

            console.log(`\n📋 Found ${users.length} user(s). Resetting passwords...\n`);

            const hashedPassword = await bcrypt.hash(NEW_PASSWORD, 10);

            for (const user of users) {
                await tenantPrisma.user.update({
                    where: { id: user.id },
                    data: { password: hashedPassword }
                });
                console.log(`  ✅ ${user.email} (${user.name})`);
            }

            console.log(`\n🎉 All ${users.length} password(s) reset successfully!`);
            console.log(`🔑 New password: ${NEW_PASSWORD}`);

        } finally {
            await tenantPrisma.$disconnect();
        }

    } finally {
        await catalogPrisma.$disconnect();
    }
}

main().catch((e) => {
    console.error('❌ Error:', e.message);
    process.exit(1);
});
