const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('🧹 Starting cleanup of Transactional Module Data...');
    console.log('⚠️  PRESERVING: Users, Roles, Departments, CostCenters, Accounts, FiscalYears, AssetCategories, Integrations.');

    // --- 1. Finance (Expenses & Budget Items first as they link to others) ---
    console.log('1️⃣  Cleaning Finance (Expenses, Budget Items)...');
    await prisma.expense.deleteMany({});
    await prisma.budgetItem.deleteMany({});
    // Delete Budgets (Parents of Items)
    await prisma.budget.deleteMany({});
    console.log('   ✅ Finance cleared.');

    // --- 2. Assets (Dependent on nothing blocking, but links to Contract/Supplier) ---
    console.log('2️⃣  Cleaning Assets & Licenses...');
    await prisma.assetMaintenance.deleteMany({});
    await prisma.asset.deleteMany({});
    await prisma.softwareLicense.deleteMany({});
    console.log('   ✅ Assets cleared.');

    // --- 3. Projects (Heavy dependencies) ---
    console.log('3️⃣  Cleaning Projects & Sub-items...');
    await prisma.projectTaskComment.deleteMany({});
    await prisma.projectTaskAttachment.deleteMany({});
    await prisma.projectTask.deleteMany({});
    await prisma.projectRisk.deleteMany({});
    await prisma.projectFollowUp.deleteMany({});
    await prisma.meetingMinute.deleteMany({});
    await prisma.projectProposal.deleteMany({});
    await prisma.projectMember.deleteMany({});
    await prisma.projectCost.deleteMany({});
    await prisma.project.deleteMany({});
    console.log('   ✅ Projects cleared.');

    // --- 4. GMUD (Change Requests) ---
    console.log('4️⃣  Cleaning Change Requests...');
    await prisma.changeApprover.deleteMany({});
    await prisma.changeComment.deleteMany({});
    await prisma.affectedService.deleteMany({});
    await prisma.changeRequest.deleteMany({});
    console.log('   ✅ GMUD cleared.');

    // --- 5. General Tasks ---
    console.log('5️⃣  Cleaning General Tasks...');
    await prisma.taskComment.deleteMany({});
    await prisma.taskAttachment.deleteMany({});
    await prisma.task.deleteMany({});
    console.log('   ✅ Tasks cleared.');

    // --- 6. Contracts & Suppliers ---
    console.log('6️⃣  Cleaning Contracts & Suppliers...');
    await prisma.contractAddendum.deleteMany({});
    await prisma.contractAttachment.deleteMany({});
    await prisma.contract.deleteMany({});
    await prisma.supplier.deleteMany({});
    console.log('   ✅ Contracts & Suppliers cleared.');

    // --- 7. Notifications (Cleanup) ---
    console.log('7️⃣  Cleaning Notifications...');
    await prisma.notification.deleteMany({});
    console.log('   ✅ Notifications cleared.');

    console.log('✨ All transactional data has been reset successfully!');
}

main()
    .catch((e) => {
        console.error('❌ Error during reset:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
