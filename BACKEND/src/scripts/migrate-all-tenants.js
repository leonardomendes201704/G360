#!/usr/bin/env node

/**
 * migrate-all-tenants.js — Roda migrations em todos os schemas de tenants ativos.
 *
 * Uso:
 *   node src/scripts/migrate-all-tenants.js
 *
 * Para cada tenant ativo no catálogo, executa:
 *   npx prisma migrate deploy --schema=src/prisma/schema.prisma
 * com DATABASE_URL apontando para o schema correto.
 */

require('dotenv').config();
const { execSync } = require('child_process');
const path = require('path');
const TenantManager = require('../config/tenant-manager');

async function main() {
    console.log('🔄 Migrando todos os tenants ativos...\n');

    const tenants = await TenantManager.getAllActiveTenants();

    if (tenants.length === 0) {
        console.log('⚠️  Nenhum tenant ativo encontrado no catálogo.');
        console.log('   Verifique se a tabela "tenants" existe no schema public.');
        process.exit(0);
    }

    console.log(`📋 ${tenants.length} tenant(s) encontrado(s):\n`);

    const schemaPath = path.resolve(__dirname, '../prisma/schema.prisma');
    const baseUrl = process.env.DATABASE_URL
        .replace(/\?schema=[^&]*/, '')
        .replace(/&schema=[^&]*/, '');
    const separator = baseUrl.includes('?') ? '&' : '?';

    let success = 0;
    let failed = 0;

    for (const tenant of tenants) {
        const { slug, schemaName } = tenant;
        const tenantUrl = `${baseUrl}${separator}schema=${schemaName}`;

        process.stdout.write(`  [${slug}] ${schemaName} ... `);

        try {
            execSync(
                `npx prisma migrate deploy --schema="${schemaPath}"`,
                {
                    env: { ...process.env, DATABASE_URL: tenantUrl },
                    stdio: 'pipe',
                    timeout: 120000, // 2min per tenant
                }
            );
            console.log('✅ OK');
            success++;
        } catch (error) {
            const raw = error.stderr?.toString()?.trim() || error.message || '';
            const lines = raw.split('\n').filter((l) => !l.startsWith('npm warn'));
            const summary = lines.filter(Boolean).slice(-5).join('\n     ') || raw.split('\n')[0] || error.message;
            console.log(`❌ FALHOU`);
            console.log(`     Erro: ${summary}`);
            failed++;
        }
    }

    console.log(`\n========================================`);
    console.log(`📊 Resultado: ${success} sucesso / ${failed} falha(s) / ${tenants.length} total`);
    console.log(`========================================\n`);

    // Cleanup
    await TenantManager.disconnectAll();
    process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
    console.error('❌ Erro fatal:', err);
    process.exit(1);
});
