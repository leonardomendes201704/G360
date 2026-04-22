#!/usr/bin/env node

/**
 * Cria ou atualiza a GMUD de teste com status **EXECUTED** (GMUD-02).
 * Requer o seed «3 áreas» (gestor OPS, projeto, ativo).
 *
 * Uso:
 *   node src/scripts/seed-gmud-gmud02-all-tenants.js
 *   npm run seed:gmud-gmud02:all
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const TenantManager = require('../config/tenant-manager');
const { seedGmudFinalizedGmud02, GMUD_GMUD02_EXEC_CODE } = require('./seed-gmud-finalized-gmud02');

async function main() {
  console.log('📋 Seed GMUD finalizada (GMUD-02) — tenants ativos ou DATABASE_URL\n');

  let tenants;
  try {
    tenants = await TenantManager.getAllActiveTenants();
  } catch (e) {
    console.warn('⚠️  Catálogo de tenants indisponível:', e.message);
    tenants = [];
  }

  if (!tenants.length) {
    console.log('ℹ️  Aplicando no schema da DATABASE_URL (sem public.tenants).\n');
    const prisma = new PrismaClient();
    try {
      const r = await seedGmudFinalizedGmud02(prisma, { verbose: true });
      if (r && r.skipped) {
        console.log('⚠️  Não foi possível criar a GMUD. Execute `npm run seed:three-areas:all` antes.');
        process.exitCode = 1;
      } else {
        console.log(`\n✅ Código: ${GMUD_GMUD02_EXEC_CODE}  status: EXECUTED\n`);
      }
    } finally {
      await prisma.$disconnect();
    }
    await TenantManager.disconnectAll();
    return;
  }

  let ok = 0;
  let failed = 0;
  for (const t of tenants) {
    const { slug, schemaName } = t;
    process.stdout.write(`  [${slug}] ${GMUD_GMUD02_EXEC_CODE} ... `);
    try {
      const prisma = TenantManager.getClientForTenant(schemaName);
      const r = await seedGmudFinalizedGmud02(prisma, { verbose: false });
      if (r && r.skipped) {
        console.log('⏭️  (sem OPS?)');
        failed += 1;
      } else {
        console.log('✅');
        ok += 1;
      }
    } catch (err) {
      console.log('❌');
      console.error(`     ${err.message}`);
      failed += 1;
    }
  }

  await TenantManager.disconnectAll();
  console.log(`\n✅ ${ok} tenant(s)  |  ❌ ${failed} falha(s) / ignorado(s)\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
