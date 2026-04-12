const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Seeding Asset Categories...');

    const categories = [
        { name: 'Notebook', type: 'HARDWARE', depreciationYears: 5 },
        { name: 'Smartphone', type: 'HARDWARE', depreciationYears: 3 },
        { name: 'Monitor', type: 'HARDWARE', depreciationYears: 5 },
        { name: 'S.O.', type: 'SOFTWARE', depreciationYears: 0 },
        { name: 'Office', type: 'SOFTWARE', depreciationYears: 0 },
        { name: 'Veículo', type: 'VEHICLE', depreciationYears: 5 },
        { name: 'Mobiliário', type: 'FURNITURE', depreciationYears: 10 },
    ];

    for (const cat of categories) {
        const exists = await prisma.assetCategory.findFirst({
            where: { name: cat.name }
        });

        if (!exists) {
            await prisma.assetCategory.create({
                data: cat
            });
            console.log(`Created: ${cat.name}`);
        } else {
            console.log(`Skipped (already exists): ${cat.name}`);
        }
    }

    console.log('Done.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
