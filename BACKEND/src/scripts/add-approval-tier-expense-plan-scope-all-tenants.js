#!/usr/bin/env node
/**
 * Adiciona expensePlanScope em "ApprovalTier" em todos os schemas de tenant ativos.
 * Uso: node src/scripts/add-approval-tier-expense-plan-scope-all-tenants.js
 */
require('dotenv').config();
const TenantManager = require('../config/tenant-manager');

const SQL = `
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'ApprovalTier' AND column_name = 'expensePlanScope'
  ) THEN
    ALTER TABLE "ApprovalTier" ADD COLUMN "expensePlanScope" TEXT;
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
