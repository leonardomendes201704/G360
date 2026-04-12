const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

// Configurações
const CATALOG_SCHEMA = 'public';
const TENANT_SLUG = 'liotencica';
const TENANT_SCHEMA = 'tenant_liotencica';

async function main() {
    console.log(`🔥 Iniciando remoção do Tenant: ${TENANT_SLUG}...`);

    // Conectar ao Catálogo (Public)
    const catalogDbUrl = process.env.DATABASE_URL.replace(/\?schema=[^&]*/, `?schema=${CATALOG_SCHEMA}`);
    const catalogPrisma = new PrismaClient({ datasources: { db: { url: catalogDbUrl } } });

    try {
        // 1. Drop Schema (Dados do Tenant)
        console.log(`🗑️ Removendo schema '${TENANT_SCHEMA}' do banco de dados...`);
        await catalogPrisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${TENANT_SCHEMA}" CASCADE`);
        console.log(`✅ Schema '${TENANT_SCHEMA}' removido (se existia).`);

        // 2. Remover do Catálogo (Metadados)
        console.log(`🗑️ Removendo registro do catálogo...`);
        const result = await catalogPrisma.$executeRaw`
            DELETE FROM tenants WHERE slug = ${TENANT_SLUG}
        `;

        console.log(`✅ Registro removido do catálogo. (${result} linhas afetadas)`);
        console.log(`✨ Tenant '${TENANT_SLUG}' apagado com sucesso.`);

    } catch (error) {
        console.error('❌ Erro durante a remoção:', error);
        process.exit(1);
    } finally {
        await catalogPrisma.$disconnect();
    }
}

main();
