require('dotenv').config({ path: 'c:/Users/lmmun/OneDrive/Desktop/g360/backend/.env' });
const { prisma } = require('c:/Users/lmmun/OneDrive/Desktop/g360/backend/src/config/database');
const BudgetService = require('c:/Users/lmmun/OneDrive/Desktop/g360/backend/src/services/budget.service');

async function testBudgetFlow() {
    try {
        console.log('--- Starting Verification ---');

        // 1. Setup Data (Fiscal Year, Account)
        const year = 2030;
        let fy = await prisma.fiscalYear.findUnique({ where: { year } });
        if (!fy) fy = await prisma.fiscalYear.create({ data: { year, startDate: new Date('2030-01-01'), endDate: new Date('2030-12-31') } });

        let account = await prisma.accountingAccount.findFirst();
        if (!account) {
            account = await prisma.accountingAccount.create({ data: { code: '9.9.9', name: 'Test Account', type: 'OPERATIONAL' } });
        }

        let costCenter = await prisma.costCenter.findFirst();
        if (!costCenter) {
            costCenter = await prisma.costCenter.create({ data: { code: 'CC-TEST', name: 'Test CC', isActive: true, name: 'Test Center' } });
        }

        // 2. Create Budget
        const budget = await prisma.budget.create({
            data: {
                fiscalYearId: fy.id,
                name: 'Test Budget 2030',
                status: 'DRAFT',
                totalOpex: 1000,
                totalCapex: 0
            }
        });
        console.log('Budget created:', budget.id);

        // 3. Add Item (Jan: 500, Feb: 500)
        await prisma.budgetItem.create({
            data: {
                budgetId: budget.id,
                budgetId: budget.id,
                accountId: account.id,
                costCenterId: costCenter.id,
                type: 'OPERATIONAL',
                jan: 500,
                feb: 500,
                total: 1000
            }
        });

        // 4. Approve Budget
        console.log('Approving budget...');
        await BudgetService.approve(budget.id, 'user-id-placeholder');

        // 5. Verify Expenses
        const expenses = await prisma.expense.findMany({
            where: { description: { contains: 'Orçamento' }, date: { gte: new Date('2030-01-01') } } // Filter to avoid noise
        });

        const relevant = expenses.filter(e => e.amount.toString() === '500');
        console.log(`Found ${relevant.length} relevant expenses generated.`);
        if (relevant.length >= 2) {
            console.log('SUCCESS: Expenses generated correctly.');
        } else {
            console.log('FAILURE: Expenses not found.');
        }

        // Cleanup
        await prisma.budget.delete({ where: { id: budget.id } }); // This might cascade delete items, but expenses are loose?
        // Actually schema relations: Budget items cascade? Yes. Expenses?
        // Expenses have no direct relation to Budget in schema... wait?
        // Schema: Expense has contractId, projectId... no budgetId. Correct.
        // So expenses persist. I should clean them up.
        await prisma.expense.deleteMany({ where: { id: { in: relevant.map(e => e.id) } } });

        console.log('Cleanup done.');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

testBudgetFlow();
