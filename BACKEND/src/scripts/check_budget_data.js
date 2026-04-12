const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkBudget() {
    try {
        console.log('--- Checking Fiscal Years ---');
        const fyears = await prisma.fiscalYear.findMany();
        console.table(fyears);

        console.log('\n--- Checking Budgets ---');
        const budgets = await prisma.budget.findMany({
            include: { fiscalYear: true } // Include relation to see if it's linked
        });
        console.dir(budgets, { depth: null });

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

checkBudget();
