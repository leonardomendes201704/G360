#!/usr/bin/env node
/**
 * Atualiza códigos longos de Department e CostCenter para versões curtas (máx. 6 caracteres, sem hífen).
 * Idempotente: se o código antigo não existir, ignora; se o novo já existir, regista erro e não duplica.
 *
 * Uso:
 *   node src/scripts/migrate-short-org-codes.js
 *   npm run db:migrate-org-codes
 *
 * Multi-tenant: aplica em todos os schemas ativos (quando `public.tenants` existe), senão na DATABASE_URL.
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const TenantManager = require('../config/tenant-manager');

/** [código_atual, código_novo] — departamentos */
const DEPARTMENT_RENAMES = [
  ['E2E-AREA-TI', 'TECNOL'], // Área Tecnologia
  ['E2E-AREA-FIN', 'FINANC'], // Área Financeiro
  ['E2E-AREA-OPS', 'OPERAC'], // Área Operações
  ['DEPT-G360-APPROVAL-DEMO', 'DIRMAT'], // Direção de operações — matriz
];

/** [código_atual, código_novo] — centros de custo */
const COST_CENTER_RENAMES = [
  ['CC-E2E-TI', 'CCTECN'],
  ['CC-E2E-FIN', 'CCFINC'],
  ['CC-E2E-OPS', 'CCOPER'],
  ['CC-G360-APPROVAL-DEMO', 'CCODIR'],
];

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 */
async function migrateShortOrgCodesForSchema(prisma) {
  let n = 0;

  for (const [from, to] of DEPARTMENT_RENAMES) {
    try {
      const r = await prisma.department.updateMany({
        where: { code: from },
        data: { code: to },
      });
      if (r.count > 0) {
        console.log(`    Department: ${from} → ${to}`);
        n += r.count;
      }
    } catch (e) {
      if (e.code === 'P2002') {
        console.warn(`    (aviso) Department "${to}" já existe — não alterado: ${from}`);
      } else {
        throw e;
      }
    }
  }

  for (const [from, to] of COST_CENTER_RENAMES) {
    try {
      const r = await prisma.costCenter.updateMany({
        where: { code: from },
        data: { code: to },
      });
      if (r.count > 0) {
        console.log(`    CostCenter: ${from} → ${to}`);
        n += r.count;
      }
    } catch (e) {
      if (e.code === 'P2002') {
        console.warn(`    (aviso) CostCenter "${to}" já existe — não alterado: ${from}`);
      } else {
        throw e;
      }
    }
  }

  return n;
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
      console.log('Migrar códigos org (schema da DATABASE_URL)…\n');
      const n = await migrateShortOrgCodesForSchema(prisma);
      console.log(`\n✅ Concluído. ${n} registo(s) atualizado(s).`);
    } finally {
      await prisma.$disconnect();
    }
    await TenantManager.disconnectAll();
    process.exit(0);
    return;
  }

  console.log(`Migrar códigos org em ${tenants.length} tenant(s)…\n`);
  let total = 0;
  for (const t of tenants) {
    process.stdout.write(`  [${t.slug}] ${t.schemaName} …\n`);
    try {
      const prisma = TenantManager.getClientForTenant(t.schemaName);
      const n = await migrateShortOrgCodesForSchema(prisma);
      total += n;
      console.log(`    → ${n} atualização(ões)\n`);
    } catch (e) {
      console.log(`    ❌ ${e.message}\n`);
    }
  }
  await TenantManager.disconnectAll();
  console.log(`\n✅ Total: ${total} atualização(ões).`);
  process.exit(0);
}

main().catch(async (e) => {
  console.error(e);
  await TenantManager.disconnectAll();
  process.exit(1);
});
