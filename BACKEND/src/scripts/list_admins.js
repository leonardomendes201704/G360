const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listAdmins() {
    try {
        console.log('--- Tenants ---');
        const tenants = await prisma.tenant.findMany();
        console.table(tenants);

        console.log('\n--- Admin Users ---');
        const users = await prisma.user.findMany({
            include: {
                tenant: true,
                roles: true
            }
        });

        // Filter or just list relevant ones
        const admins = users.filter(u =>
            u.roles.some(r => r.name === 'SUPER_ADMIN' || r.name === 'COMPANY_ADMIN') ||
            u.email.includes('admin') ||
            u.email.includes('sistemas')
        );

        admins.forEach(u => {
            console.log(`\nUser: ${u.name} (${u.email})`);
            console.log(`Roles: ${u.roles.map(r => r.name).join(', ') || 'None'}`);
            console.log(`Tenant: ${u.tenant?.name}`);
            console.log(`Status: ${u.isActive ? 'Active' : 'Inactive'}`);
        });

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

listAdmins();
