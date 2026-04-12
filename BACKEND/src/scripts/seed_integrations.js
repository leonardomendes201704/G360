const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('🔄 Seeding Integrations...');

    const integrations = [
        { type: 'AZURE', name: 'Azure Active Directory', isEnabled: false },
        { type: 'LDAP', name: 'LDAP / Active Directory', isEnabled: false },
        { type: 'SMTP', name: 'Servidor SMTP', isEnabled: false }
    ];

    for (const data of integrations) {
        await prisma.integration.upsert({
            where: { type: data.type },
            update: {},
            create: data
        });
    }

    console.log('✅ Integrations seeded successfully');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
