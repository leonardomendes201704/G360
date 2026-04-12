#!/usr/bin/env node

/**
 * Aplica o seed do catálogo ITIL (SLAs, categorias, serviços e formulários)
 * em todos os tenants ativos listados na tabela `public.tenants`.
 *
 * Idempotente: seguro rodar após cada deploy.
 *
 * Uso:
 *   node src/scripts/seed-catalog-all-tenants.js
 *   npm run seed:catalog:all
 *
 * Se não houver linhas em `tenants`, usa o Prisma padrão (schema da DATABASE_URL).
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const TenantManager = require('../config/tenant-manager');
const { seedItilServiceCatalog } = require('./seed-itil-service-catalog');

async function main() {
  console.log('🌱 Seed catálogo ITIL — todos os tenants ativos\n');

  let tenants;
  try {
    tenants = await TenantManager.getAllActiveTenants();
  } catch (e) {
    console.warn('⚠️  Catálogo de tenants indisponível:', e.message);
    tenants = [];
  }

  if (!tenants.length) {
    console.log('ℹ️  Nenhum tenant ativo em `public.tenants` — aplicando no schema da DATABASE_URL.\n');
    const prisma = new PrismaClient();
    try {
      await seedItilServiceCatalog(prisma, { verbose: true });
    } finally {
      await prisma.$disconnect();
    }
    await TenantManager.disconnectAll();
    console.log('\n✅ Catálogo ITIL aplicado (schema padrão).\n');
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
      await seedItilServiceCatalog(prisma, { verbose: false });
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
  console.log(`📊 Catálogo ITIL: ${ok} OK / ${failed} falha(s) / ${tenants.length} tenant(s)`);
  console.log(`========================================\n`);

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(async (err) => {
  console.error('❌ Erro fatal:', err);
  await TenantManager.disconnectAll();
  process.exit(1);
});
