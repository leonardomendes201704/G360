const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

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
    const catalogUrl = buildUrlForSchema('public');
    const catalogPrisma = new PrismaClient({ datasources: { db: { url: catalogUrl } } });

    try {
        const tenants = await catalogPrisma.$queryRaw`
            SELECT id, name, slug, schema_name FROM tenants ORDER BY name
        `;

        console.log(`\n📋 Encontrados ${tenants.length} tenant(s)\n`);
        console.log('='.repeat(80));

        const hashedPassword = await bcrypt.hash(NEW_PASSWORD, 10);
        let totalUsers = 0;

        for (const tenant of tenants) {
            console.log(`\n🏢 TENANT: ${tenant.name} (slug: ${tenant.slug}, schema: ${tenant.schema_name})`);
            console.log('-'.repeat(80));

            const tenantUrl = buildUrlForSchema(tenant.schema_name);
            const tenantPrisma = new PrismaClient({ datasources: { db: { url: tenantUrl } } });

            try {
                const users = await tenantPrisma.user.findMany({
                    select: { id: true, email: true, name: true, isActive: true, authProvider: true },
                    orderBy: { name: 'asc' }
                });

                if (users.length === 0) {
                    console.log('   (nenhum usuário)');
                    continue;
                }

                // Reset passwords
                await tenantPrisma.user.updateMany({
                    data: { password: hashedPassword }
                });

                console.log(`   ${'#'.padEnd(4)} ${'Nome'.padEnd(30)} ${'Email'.padEnd(40)} ${'Ativo'.padEnd(8)} ${'Auth'.padEnd(10)} Senha`);
                console.log(`   ${'─'.repeat(4)} ${'─'.repeat(30)} ${'─'.repeat(40)} ${'─'.repeat(8)} ${'─'.repeat(10)} ${'─'.repeat(12)}`);

                users.forEach((u, i) => {
                    const num = String(i + 1).padEnd(4);
                    const name = (u.name || '—').substring(0, 29).padEnd(30);
                    const email = u.email.substring(0, 39).padEnd(40);
                    const active = (u.isActive ? '✅ Sim' : '❌ Não').padEnd(8);
                    const auth = (u.authProvider || 'LOCAL').padEnd(10);
                    console.log(`   ${num} ${name} ${email} ${active}  ${auth} ********`);
                });

                console.log(`\n   ✅ ${users.length} senha(s) resetada(s)`);
                totalUsers += users.length;
            } finally {
                await tenantPrisma.$disconnect();
            }
        }

        console.log('\n' + '='.repeat(80));
        console.log(`\n🎉 TOTAL: ${totalUsers} usuário(s) em ${tenants.length} tenant(s)\n`);

    } finally {
        await catalogPrisma.$disconnect();
    }
}

main().catch(e => { console.error('❌ Erro:', e.message); process.exit(1); });
