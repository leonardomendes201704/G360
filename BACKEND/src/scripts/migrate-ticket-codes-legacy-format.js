#!/usr/bin/env node
/**
 * Converte códigos legados HD-AAAA-NNNN → HDyynnnn (sem hífens, ano com 2 dígitos).
 *
 * Uso: npm run db:migrate-ticket-codes
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const TenantManager = require('../config/tenant-manager');

const LEGACY = /^HD-(\d{4})-(\d+)$/;

function legacyToCompact(code) {
  const m = LEGACY.exec(String(code).trim());
  if (!m) return null;
  const year = parseInt(m[1], 10);
  const seq = parseInt(m[2], 10);
  const yy = String(year).slice(-2);
  return `HD${yy}${String(seq).padStart(4, '0')}`;
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 */
async function migrateSchema(prisma) {
  const tickets = await prisma.ticket.findMany({
    select: { id: true, code: true },
    orderBy: { createdAt: 'asc' },
  });

  const updates = [];
  for (const t of tickets) {
    const next = legacyToCompact(t.code);
    if (!next || next === t.code) continue;
    updates.push({ id: t.id, old: t.code, next });
  }

  if (!updates.length) {
    console.log('    (nenhum código legado HD-AAAA-NNNN encontrado)');
    return 0;
  }

  const seen = new Set();
  for (const u of updates) {
    if (seen.has(u.next)) {
      throw new Error(`Colisão ao gerar ${u.next} a partir de múltiplos códigos.`);
    }
    seen.add(u.next);
  }

  let n = 0;
  for (const u of updates) {
    const taken = await prisma.ticket.findFirst({
      where: { code: u.next, NOT: { id: u.id } },
      select: { id: true },
    });
    if (taken) {
      console.warn(`    (aviso) ${u.next} já existe noutro registo — a saltar ${u.old}`);
      continue;
    }
    await prisma.ticket.update({
      where: { id: u.id },
      data: { code: u.next },
    });
    console.log(`    ${u.old} → ${u.next}`);
    n += 1;
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
      console.log('Migrar códigos de chamados (schema DATABASE_URL)…\n');
      const n = await migrateSchema(prisma);
      console.log(`\n✅ ${n} chamado(s) atualizado(s).`);
    } finally {
      await prisma.$disconnect();
    }
    await TenantManager.disconnectAll();
    process.exit(0);
    return;
  }

  console.log(`Migrar códigos de chamados em ${tenants.length} tenant(s)…\n`);
  let total = 0;
  for (const t of tenants) {
    process.stdout.write(`  [${t.slug}] ${t.schemaName} …\n`);
    try {
      const prisma = TenantManager.getClientForTenant(t.schemaName);
      const n = await migrateSchema(prisma);
      total += n;
      console.log(`    → ${n} atualização(ões)\n`);
    } catch (e) {
      console.error(`    ❌ ${e.message}\n`);
    }
  }
  await TenantManager.disconnectAll();
  console.log(`\n✅ Total: ${total} chamado(s).`);
  process.exit(0);
}

main().catch(async (e) => {
  console.error(e);
  await TenantManager.disconnectAll();
  process.exit(1);
});
