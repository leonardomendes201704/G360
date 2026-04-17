#!/usr/bin/env node
/**
 * Portal de Suporte — gera chamados por serviço do catálogo (todos os estados); textos neutros.
 *
 * Uso:
 *   node src/scripts/seed-portal-tickets-showcase-all-tenants.js
 *   npm run seed:portal-tickets:all
 *
 * Opcional:
 *   SEED_PORTAL_REQUESTER_EMAIL — utilizador que aparece como solicitante (default admin@g360.com.br ou primeiro ativo)
 *   SEED_PORTAL_MAX_SERVICES=N — processa só os N primeiros serviços ativos (catálogos grandes)
 *   --reset  ou  SEED_PORTAL_CLEANUP=1 — apaga chamados gerados por este script antes de recriar (dept/CC no tenant)
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const TenantManager = require('../config/tenant-manager');
const { seedPortalTicketsShowcase } = require('./seed-portal-tickets-showcase');

async function main() {
    const email = process.env.SEED_PORTAL_REQUESTER_EMAIL || process.env.SEED_APPROVALS_USER_EMAIL || 'admin@g360.com.br';
    const maxRaw = process.env.SEED_PORTAL_MAX_SERVICES;
    const parsedMax = maxRaw != null && maxRaw !== '' ? parseInt(maxRaw, 10) : NaN;
    const maxServices = !Number.isNaN(parsedMax) && parsedMax > 0 ? parsedMax : null;
    const cleanupFirst =
        process.argv.includes('--reset') ||
        process.env.SEED_PORTAL_CLEANUP === '1' ||
        process.env.SEED_PORTAL_CLEANUP === 'true';

    console.log('🌱 Portal de Suporte — chamados por serviço × estados\n');
    console.log(`   Solicitante alvo: ${email}`);
    if (maxServices != null) {
        console.log(`   Limite de serviços: ${maxServices}`);
    }
    if (cleanupFirst) {
        console.log('   Modo: limpar chamados de showcase e recriar (dept/CC resolvidos no tenant)');
    }
    console.log('');

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
            const summary = await seedPortalTicketsShowcase(prisma, {
                verbose: true,
                userEmail: email,
                maxServices,
                cleanupFirst,
            });
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
            await seedPortalTicketsShowcase(prisma, {
                verbose: false,
                userEmail: email,
                maxServices,
                cleanupFirst,
            });
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
    console.log(`📊 Portal tickets seed: ${ok} OK / ${failed} falha(s) / ${tenants.length} tenant(s)`);
    console.log(`========================================\n`);

    process.exit(failed > 0 ? 1 : 0);
}

main().catch(async (err) => {
    console.error('❌ Erro fatal:', err);
    await TenantManager.disconnectAll();
    process.exit(1);
});
