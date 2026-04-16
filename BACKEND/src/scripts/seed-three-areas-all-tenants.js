#!/usr/bin/env node

/**
 * Aplica o seed de 3 áreas + dados transversais em todos os tenants ativos.
 *
 * Uso:
 *   node src/scripts/seed-three-areas-all-tenants.js
 *   npm run seed:three-areas:all
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const TenantManager = require('../config/tenant-manager');
const { seedThreeAreasWorkflow } = require('./seed-three-areas-workflow');

async function main() {
  console.log('🌱 Seed 3 áreas (workflow E2E) — todos os tenants ativos\n');

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
      const summary = await seedThreeAreasWorkflow(prisma, { verbose: true });
      console.log('\n✅ Concluído. Senha seed (SEED_E2E_PASSWORD / E2E_PASSWORD ou padrão):', summary.password);
      console.log('   Contas gestor:', summary.areas.map((a) => a.managerEmail).join(', '));
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
      await seedThreeAreasWorkflow(prisma, { verbose: false });
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
  console.log(`📊 3 áreas E2E: ${ok} OK / ${failed} falha(s) / ${tenants.length} tenant(s)`);
  console.log(`   Senha: ${process.env.SEED_E2E_PASSWORD || process.env.E2E_PASSWORD || '(padrão L89*Eb5v@)'}`);
  console.log(`========================================\n`);

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(async (err) => {
  console.error('❌ Erro fatal:', err);
  await TenantManager.disconnectAll();
  process.exit(1);
});
