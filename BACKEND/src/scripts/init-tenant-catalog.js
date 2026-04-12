/**
 * Script: Inicializar catálogo de tenants
 * 
 * Cria a tabela `tenants` no schema `public` e registra
 * o tenant padrão (instalação atual) para backward compatibility.
 * 
 * Uso:
 *   node src/scripts/init-tenant-catalog.js
 * 
 * EXECUTAR UMA ÚNICA VEZ após ativar multi-tenant.
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const { PrismaClient } = require('@prisma/client');

async function main() {
    const prisma = new PrismaClient();

    try {
        console.log('\n🏗️  Inicializando catálogo de tenants...\n');

        // 1. Criar tabela tenants no schema public
        await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS tenants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(100) UNIQUE NOT NULL,
        schema_name VARCHAR(100) UNIQUE NOT NULL,
        is_active BOOLEAN DEFAULT true,
        plan VARCHAR(50) DEFAULT 'STANDARD',
        max_users INT DEFAULT 50,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;
        console.log('✅ Tabela "tenants" criada (ou já existia).');

        // 2. Verificar se o tenant padrão já existe
        const existing = await prisma.$queryRaw`
      SELECT id FROM tenants WHERE slug = 'default'
    `;

        if (existing.length === 0) {
            // 3. Registrar o tenant padrão (instalação atual)
            // Isso faz com que a instalação existente continue funcionando
            // como o tenant "default" usando o schema "public"
            await prisma.$executeRaw`
        INSERT INTO tenants (name, slug, schema_name, plan)
        VALUES ('Empresa Padrão', 'default', 'public', 'ENTERPRISE')
      `;
            console.log('✅ Tenant padrão "default" registrado (schema: public).');
            console.log('   ℹ️  Este tenant representa a instalação atual do sistema.');
        } else {
            console.log('⚠️  Tenant "default" já existe, pulando.');
        }

        // 4. Listar tenants
        const tenants = await prisma.$queryRaw`
      SELECT name, slug, schema_name, is_active, plan FROM tenants ORDER BY created_at
    `;

        console.log(`\n📋 Tenants registrados (${tenants.length}):`);
        tenants.forEach(t => {
            const status = t.is_active ? '🟢' : '🔴';
            console.log(`  ${status} ${t.name} (${t.slug}) → schema: ${t.schema_name} [${t.plan}]`);
        });

        console.log('\n🎉 Catálogo inicializado com sucesso!\n');

    } catch (error) {
        console.error('❌ Erro:', error.message);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
