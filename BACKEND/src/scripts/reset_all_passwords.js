const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const NEW_PASSWORD = 'L89*Eb5v@';

async function main() {
    const prisma = new PrismaClient({ log: ['warn', 'error'] });

    try {
        console.log('🔌 Conectando ao banco...');
        await prisma.$connect();
        console.log('✅ Conectado!\n');

        // List all tenants
        const tenants = await prisma.tenant.findMany({ select: { id: true, name: true, slug: true } });
        console.log(`📋 Encontrados ${tenants.length} tenant(s):\n`);
        tenants.forEach(t => console.log(`   - ${t.name} (${t.slug})`));

        // Hash the new password
        console.log('\n🔐 Gerando hash...');
        const hashedPassword = await bcrypt.hash(NEW_PASSWORD, 10);

        // Update ALL users across ALL tenants
        const result = await prisma.user.updateMany({
            data: { password: hashedPassword }
        });

        console.log(`\n✅ Senha resetada para ${result.count} usuário(s) de todos os tenants`);

        // Show summary per tenant
        for (const tenant of tenants) {
            const count = await prisma.user.count({ where: { tenantId: tenant.id } });
            console.log(`   ${tenant.name}: ${count} usuário(s)`);
        }

        // Also count global admins (no tenant)
        const globalCount = await prisma.user.count({ where: { tenantId: null } });
        if (globalCount > 0) {
            console.log(`   Global Admins: ${globalCount} usuário(s)`);
        }

    } catch (error) {
        console.error('❌ Erro:', error.message);
    } finally {
        await prisma.$disconnect();
        console.log('\n🔌 Desconectado.');
    }
}

main();
