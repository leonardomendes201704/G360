const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
    try {
        const tenant = await prisma.tenant.findUnique({ where: { slug: 'liotecnica' } });
        if (!tenant) throw new Error('Tenant liotecnica não encontrado');

        console.log(`\nTenant: ${tenant.name} (${tenant.id})\n`);

        const users = await prisma.user.findMany({
            where: { tenantId: tenant.id },
            orderBy: { name: 'asc' },
            select: { id: true, name: true, email: true, isActive: true }
        });

        console.log('=== Usuários ===');
        users.forEach((u, i) => console.log(`${i + 1}. ${u.name} | ${u.email} | Ativo: ${u.isActive}`));
        console.log(`\nTotal: ${users.length}\n`);

        const hash = await bcrypt.hash('L89*Eb5v@', 10);
        const result = await prisma.user.updateMany({
            where: { tenantId: tenant.id },
            data: { password: hash }
        });
        console.log(`✅ Senha resetada para ${result.count} usuários para: L89*Eb5v@`);

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
