const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listExpenses() {
    try {
        const expenses = await prisma.expense.findMany();
        console.log('--- All Expenses ---');
        console.log(`Total count: ${expenses.length}`);
        if (expenses.length > 0) {
            console.table(expenses);
        }
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

listExpenses();
