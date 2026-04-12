
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('--- USERS ---');
    const users = await prisma.user.findMany({
        take: 10,
        select: { id: true, name: true, email: true, roles: { select: { name: true } } }
    });
    console.log(JSON.stringify(users, null, 2));

    console.log('\n--- DISTINCT MODULES IN AUDIT LOG ---');
    const modules = await prisma.auditLog.groupBy({
        by: ['module'],
        _count: true
    });
    console.log(JSON.stringify(modules, null, 2));

    console.log('\n--- LAST 20 AUDIT LOGS ---');
    const logs = await prisma.auditLog.findMany({
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { name: true, email: true } } }
    });

    logs.forEach(log => {
        console.log(`[${log.createdAt.toISOString()}] Module: ${log.module} | Action: ${log.action} | User: ${log.user?.name} (${log.userId})`);
        // console.log('NewData:', JSON.stringify(log.newData).substring(0, 100) + '...');
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
