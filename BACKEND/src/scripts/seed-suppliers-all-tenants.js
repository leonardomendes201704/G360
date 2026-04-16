#!/usr/bin/env node

/**
 * Aplica o seed de fornecedores (10 registros idempotentes) em todos os tenants ativos.
 *
 * Uso:
 *   node src/scripts/seed-suppliers-all-tenants.js
 *   npm run seed:suppliers:all
 *
 * Se não houver linhas em `public.tenants`, usa o schema da DATABASE_URL.
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const TenantManager = require('../config/tenant-manager');
const { seedSuppliers } = require('./seed-suppliers');

async function main() {
  console.log('🌱 Seed fornecedores — todos os tenants ativos\n');

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
      const { count } = await seedSuppliers(prisma, { verbose: true });
      console.log(`\n✅ Fornecedores: ${count} registro(s) (upsert).\n`);
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
      const { count } = await seedSuppliers(prisma, { verbose: false });
      console.log(`✅ (${count})`);
      ok += 1;
    } catch (err) {
      console.log('❌');
      console.error(`     ${err.message}`);
      failed += 1;
    }
  }

  await TenantManager.disconnectAll();

  console.log(`\n========================================`);
  console.log(`📊 Fornecedores: ${ok} OK / ${failed} falha(s) / ${tenants.length} tenant(s)`);
  console.log(`========================================\n`);

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(async (err) => {
  console.error('❌ Erro fatal:', err);
  await TenantManager.disconnectAll();
  process.exit(1);
});
