const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixFiscalYear() {
    try {
        // Find the 2026 fiscal year
        const fy2026 = await prisma.fiscalYear.findUnique({ where: { year: 2026 } });

        if (fy2026) {
            console.log('Found Fiscal Year 2026. Updating to 2025...');
            await prisma.fiscalYear.update({
                where: { id: fy2026.id },
                data: {
                    year: 2025,
                    startDate: new Date('2025-01-01T00:00:00.000Z'),
                    endDate: new Date('2025-12-31T00:00:00.000Z')
                }
            });
            console.log('Update complete.');
        } else {
            console.log('Fiscal Year 2026 not found. Creating 2025 if missing...');
            const fy2025 = await prisma.fiscalYear.findUnique({ where: { year: 2025 } });
            if (!fy2025) {
                await prisma.fiscalYear.create({
                    data: {
                        year: 2025,
                        startDate: new Date('2025-01-01T00:00:00.000Z'),
                        endDate: new Date('2025-12-31T00:00:00.000Z')
                    }
                });
                console.log('Created Fiscal Year 2025.');
            }
        }

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

fixFiscalYear();
