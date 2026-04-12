const BudgetService = require('../services/budget.service');
const BudgetRepository = require('../repositories/budget.repository');
const { prisma } = require('../config/database');

async function main() {
    try {
        console.log('--- Iniciando Verificação de Duplicação ---');

        // 1. Find a budget to duplicate (or create one)
        let original = await prisma.budget.findFirst({
            where: { items: { some: {} } }, // Find one with items
            include: { items: true }
        });

        if (!original) {
            console.log('Nenhum orçamento com itens encontrado. Criando um de teste...');
            // Create logic here if needed, but usually there is seed data
            // For now, let's just create a dummy one if empty
            const fy = await prisma.fiscalYear.findFirst();
            original = await BudgetRepository.create({
                name: 'Original Test',
                fiscalYearId: fy.id,
                type: 'OPEX',
                status: 'DRAFT'
                // userId: 'system' // Removed because we want to test duplication
            });
        }

        // Find a valid user for AuditLog
        const user = await prisma.user.findFirst();
        const userId = user ? user.id : 'system'; // Fallback

        if (!user) {
            console.warn('AVISO: Nenhum usuário encontrado no banco. AuditLog pode falhar se FK for estrita.');
        }

        console.log(`Orçamento Original: ${original.name} (ID: ${original.id})`);
        console.log(`Itens: ${original.items ? original.items.length : 0}`);

        // 2. Duplicate
        const newName = `Cópia teste ${Date.now()}`;
        console.log(`Duplicando para: ${newName}`);

        const copy = await BudgetService.duplicate(original.id, newName, userId);

        console.log(`Orçamento Copiado: ${copy.name} (ID: ${copy.id})`);

        // 3. Verify
        const fullCopy = await BudgetRepository.findById(copy.id);
        console.log(`Itens na Cópia: ${fullCopy.items.length}`);

        if (original.items && original.items.length > 0) {
            if (fullCopy.items.length !== original.items.length) {
                throw new Error('Número de itens incorreto!');
            }
            console.log('VALIDADO: Número de itens confere.');
        }

        if (fullCopy.status !== 'DRAFT') {
            throw new Error('Status deve ser DRAFT');
        }
        console.log('VALIDADO: Status é DRAFT.');

        // Cleanup
        await BudgetService.delete(copy.id, userId);
        console.log('Limpeza realizada.');

        console.log('--- SUCESSO ---');

    } catch (e) {
        console.error('ERRO:', e);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
