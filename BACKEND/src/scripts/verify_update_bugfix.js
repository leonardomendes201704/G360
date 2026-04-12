const BudgetService = require('../services/budget.service');
const { prisma } = require('../config/database');

async function main() {
    try {
        console.log('--- Iniciando Verificação de Update ---');

        // 1. Find a budget to update
        const budget = await prisma.budget.findFirst();
        if (!budget) {
            throw new Error('Nenhum orçamento encontrado para teste.');
        }
        console.log(`Orçamento encontrado: ${budget.name} (${budget.id})`);

        // 2. Simulate Payload with "Problematic" fields
        const problematicPayload = {
            name: `${budget.name} (Updated)`,
            userId: 'test-user-id', // Should be stripped/ignored by updatePayload, used for audit
            fiscalYearId: budget.fiscalYearId, // Should be converted to connect
            items: [], // Should be stripped
            scenarios: [], // Should be stripped
            createdAt: new Date(), // Should be stripped
            updatedAt: new Date()  // Should be stripped
        };

        // Pass userId separately as expected by controller, but here we invoke service manually
        // The service signature is update(id, data). 
        // In controller: Service.update(id, { ...body, userId })
        // So problematicPayload is exactly what gets passed.

        console.log('Enviando payload com campos extras...');
        const updated = await BudgetService.update(budget.id, problematicPayload);

        console.log('Update realizado com sucesso!');
        console.log(`Novo Nome: ${updated.name}`);

        // Revert name
        await BudgetService.update(budget.id, { name: budget.name, userId: 'system' });
        console.log('Nome revertido.');

    } catch (e) {
        console.error('ERRO:', e);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
