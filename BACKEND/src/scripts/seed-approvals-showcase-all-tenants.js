#!/usr/bin/env node
/**
 * Aplica seed de showcase "Minhas aprovações" em todos os tenants ativos (ou no schema da DATABASE_URL).
 *
 * Uso:
 *   node src/scripts/seed-approvals-showcase-all-tenants.js
 *   npm run seed:approvals-showcase:all
 *
 * Opcional: SEED_APPROVALS_USER_EMAIL=admin@empresa.com
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const TenantManager = require('../config/tenant-manager');
const { seedApprovalsShowcase } = require('./seed-approvals-showcase');

async function main() {
    const email = process.env.SEED_APPROVALS_USER_EMAIL || 'admin@g360.com.br';
    console.log('🌱 Minhas aprovações — preenchimento da fila\n');
    console.log(`   Utilizador alvo: ${email}\n`);

    let tenants;
    try {
        tenants = await TenantManager.getAllActiveTenants();
    } catch (e) {
        console.warn('⚠️  Catálogo de tenants indisponível:', e.message);
        tenants = [];
    }

    if (!tenants.length) {
        console.log('ℹ️  Nenhum tenant em `public.tenants` — aplicando no schema da DATABASE_URL.\n');
        const prisma = new PrismaClient();
        try {
            const summary = await seedApprovalsShowcase(prisma, { verbose: true, userEmail: email });
            console.log('\n✅ Concluído.', summary);
        } finally {
            await prisma.$disconnect();
        }
        await TenantManager.disconnectAll();
        process.exit(0);
        return;
    }

    let ok = 0;
    let failed = 0;

    for (const t of tenants) {
        const { slug, schemaName } = t;
        process.stdout.write(`  [${slug}] ${schemaName} ... `);
        try {
            const prisma = TenantManager.getClientForTenant(schemaName);
            await seedApprovalsShowcase(prisma, { verbose: false, userEmail: email });
            console.log('✅');
            ok += 1;
        } catch (err) {
            console.log('❌');
            console.error(`     ${err.message}`);
            failed += 1;
        }
    }

    await TenantManager.disconnectAll();

    console.log(`\n========================================`);
    console.log(`📊 Minhas aprovações: ${ok} OK / ${failed} falha(s) / ${tenants.length} tenant(s)`);
    console.log(`========================================\n`);

    process.exit(failed > 0 ? 1 : 0);
}

main().catch(async (err) => {
    console.error('❌ Erro fatal:', err);
    await TenantManager.disconnectAll();
    process.exit(1);
});
