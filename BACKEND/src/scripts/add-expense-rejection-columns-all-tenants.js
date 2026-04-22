#!/usr/bin/env node
/**
 * Adiciona rejectionReason e requiresAdjustment em "Expense" em todos os schemas de tenant ativos.
 * Necessário em ambientes multi-schema onde `prisma db push` foi corrido só em `public`.
 *
 * Uso: node src/scripts/add-expense-rejection-columns-all-tenants.js
 */
require('dotenv').config();
const TenantManager = require('../config/tenant-manager');

const SQL = `
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'Expense' AND column_name = 'rejectionReason'
  ) THEN
    ALTER TABLE "Expense" ADD COLUMN "rejectionReason" TEXT;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'Expense' AND column_name = 'requiresAdjustment'
  ) THEN
    ALTER TABLE "Expense" ADD COLUMN "requiresAdjustment" BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;
`;

async function main() {
    const tenants = await TenantManager.getAllActiveTenants();
    if (!tenants.length) {
        console.log('Nenhum tenant ativo no catálogo; nada a fazer.');
        await TenantManager.disconnectAll();
        process.exit(0);
    }

    let ok = 0;
    let fail = 0;
    for (const t of tenants) {
        const { slug, schemaName } = t;
        process.stdout.write(`[${slug}] ${schemaName} ... `);
        try {
            const prisma = TenantManager.getClientForTenant(schemaName);
            await prisma.$executeRawUnsafe(SQL);
            await TenantManager.evictClient(schemaName);
            console.log('OK');
            ok++;
        } catch (e) {
            console.log('FALHOU');
            console.error(e.message || e);
            fail++;
        }
    }

    await TenantManager.disconnectAll();
    console.log(`\nConcluído: ${ok} OK, ${fail} falha(s).`);
    process.exit(fail > 0 ? 1 : 0);
}

main().catch(async (e) => {
    console.error(e);
    await TenantManager.disconnectAll();
    process.exit(1);
});
