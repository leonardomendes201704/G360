const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const integrations = await prisma.integration.findMany();
    console.log('Integrações encontradas:', integrations.length);
    console.log(JSON.stringify(integrations, null, 2));
}

main()
    .finally(() => prisma.$disconnect());
