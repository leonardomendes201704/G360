#!/usr/bin/env node
/**
 * Remove prefixos de demo ([Seed Portal], [Seed Aprovações], etc.) e substitui textos óbvios de teste
 * por formulações compatíveis com ambiente de produção. Executar após migrações de conteúdo ou uma vez
 * para limpar bases já povoadas por seeds antigos.
 *
 * Uso:
 *   node src/scripts/sanitize-production-like-labels.js
 *   npm run db:sanitize-labels
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const TenantManager = require('../config/tenant-manager');

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 */
async function sanitizeTenantSchema(prisma) {
    const runs = [
        // Helpdesk — títulos e descrições gerados por seeds antigos do portal
        `UPDATE "Ticket" SET title = TRIM(REPLACE(title, '[Seed Portal] ', '')) WHERE title LIKE '[Seed Portal]%'`,
        `UPDATE "Ticket" SET description = REPLACE(description, 'Demonstração Portal de Suporte (seed). ', 'Registado via portal de suporte. ') WHERE description LIKE '%Demonstração Portal de Suporte%'`,
        // Aprovações — departamento / CC / projetos (códigos estáveis do seed)
        `UPDATE "Department" SET name = 'Direção de operações — matriz' WHERE code = 'DEPT-G360-APPROVAL-DEMO'`,
        `UPDATE "CostCenter" SET name = 'Centro de custo — operações diretas' WHERE code = 'CC-G360-APPROVAL-DEMO'`,
        `UPDATE "Project" SET name = 'Projeto — baseline em aprovação', description = 'Planeamento inicial e aprovação de orçamento.' WHERE code = 'PRJ-G360-PENDING-BASELINE'`,
        `UPDATE "Project" SET name = 'Projeto — custos, atas e propostas', description = 'Acompanhamento operacional e documentação associada.' WHERE code = 'PRJ-G360-APPROVAL-CTX'`,
        `UPDATE "Expense" SET description = 'Despesa operacional — manutenção preventiva' WHERE description LIKE '[Seed Aprovações] Despesa operacional%' OR description = '[Seed Aprovações] Despesa operacional'`,
        `UPDATE "ProjectCost" SET description = 'Custo de projeto — infraestrutura' WHERE description LIKE '[Seed Aprovações] Custo de projeto%'`,
        `UPDATE "MeetingMinute" SET title = 'Ata — alinhamento de projeto', "fileUrl" = '/uploads/ata-reuniao-projeto.pdf', "fileName" = 'ata-reuniao-projeto.pdf' WHERE title LIKE '[Seed Aprovações] Ata%'`,
        `UPDATE "ProjectProposal" SET description = 'Proposta comparativa — fornecedor preferencial' WHERE description LIKE '[Seed Aprovações] Proposta%'`,
        `UPDATE "Budget" SET name = 'Orçamento anual — revisão', description = 'Consolidação de rubricas para o exercício corrente.' WHERE name LIKE '[Seed Aprovações] Orçamento%'`,
        `UPDATE "BudgetItem" SET description = 'Rubrica — despesas recorrentes' WHERE description = 'Linha seed'`,
        `UPDATE "ChangeRequest" SET title = 'Alteração — janela de manutenção programada', description = 'Pedido de alteração para atualização controlada do ambiente.', justification = 'Janela acordada com as áreas de negócio.' WHERE code = 'GMUD-G360-APPROVAL-DEMO'`,
        `UPDATE "Supplier" SET name = 'Materiais Silva Comércio Ltda', "tradeName" = 'Materiais Silva' WHERE document = '11222333000199'`,
        `UPDATE "AccountingAccount" SET name = 'Despesas correntes — operações' WHERE code = 'SEED-APPROVAL-ACC'`,
    ];

    for (const sql of runs) {
        try {
            await prisma.$executeRawUnsafe(sql);
        } catch (e) {
            // Tabela pode não existir em schema vazio; ignora erro pontual
            if (process.env.SANITIZE_VERBOSE === '1') {
                console.warn('  (aviso SQL)', e.message);
            }
        }
    }

    // Nomes que ainda contenham o prefixo (fallback genérico)
    try {
        await prisma.$executeRawUnsafe(
            `UPDATE "Department" SET name = TRIM(REPLACE(name, '[Seed Aprovações] ', '')) WHERE name LIKE '[Seed Aprovações]%'`
        );
        await prisma.$executeRawUnsafe(
            `UPDATE "CostCenter" SET name = TRIM(REPLACE(name, '[Seed Aprovações] ', '')) WHERE name LIKE '[Seed Aprovações]%'`
        );
        await prisma.$executeRawUnsafe(
            `UPDATE "Project" SET name = TRIM(REPLACE(name, '[Seed Aprovações] ', '')) WHERE name LIKE '[Seed Aprovações]%'`
        );
        await prisma.$executeRawUnsafe(
            `UPDATE "Project" SET description = TRIM(REPLACE(description, 'Seed Minhas Aprovações', 'Documentação interna')) WHERE description LIKE '%Seed Minhas Aprovações%'`
        );
        await prisma.$executeRawUnsafe(
            `UPDATE "Budget" SET description = TRIM(REPLACE(description, 'Seed Minhas Aprovações', 'Planeamento financeiro')) WHERE description LIKE '%Seed Minhas Aprovações%'`
        );
        await prisma.$executeRawUnsafe(
            `UPDATE "ChangeRequest" SET description = TRIM(REPLACE(description, 'Seed Minhas Aprovações', 'Pedido formal de alteração')) WHERE description LIKE '%Seed Minhas Aprovações%'`
        );
    } catch (e) {
        if (process.env.SANITIZE_VERBOSE === '1') console.warn(e.message);
    }
}

async function main() {
    let tenants;
    try {
        tenants = await TenantManager.getAllActiveTenants();
    } catch (e) {
        tenants = [];
    }

    if (!tenants.length) {
        const prisma = new PrismaClient();
        try {
            console.log('Sanitizar labels (schema da DATABASE_URL)…');
            await sanitizeTenantSchema(prisma);
            console.log('✅ Concluído.');
        } finally {
            await prisma.$disconnect();
        }
        await TenantManager.disconnectAll();
        process.exit(0);
        return;
    }

    console.log(`Sanitizar labels em ${tenants.length} tenant(s)…\n`);
    for (const t of tenants) {
        process.stdout.write(`  [${t.slug}] ${t.schemaName} … `);
        try {
            const prisma = TenantManager.getClientForTenant(t.schemaName);
            await sanitizeTenantSchema(prisma);
            console.log('✅');
        } catch (e) {
            console.log('❌', e.message);
        }
    }
    await TenantManager.disconnectAll();
    console.log('\n✅ Sanitização terminada.');
    process.exit(0);
}

main().catch(async (e) => {
    console.error(e);
    await TenantManager.disconnectAll();
    process.exit(1);
});
