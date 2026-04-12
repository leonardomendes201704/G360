#!/usr/bin/env node

/**
 * setup-catalog.js — Cria a tabela de catálogo de tenants no schema public.
 * 
 * Uso:
 *   node src/scripts/setup-catalog.js
 * 
 * Também registra o tenant "default" para o schema atual (backward compat).
 */

require('dotenv').config();
const TenantManager = require('../config/tenant-manager');

async function main() {
  console.log('🏗️  Configurando catálogo de tenants...\n');

  const catalog = TenantManager.getCatalogClient();

  // 1. Criar tabela tenants se não existir
  await catalog.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS tenants (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      slug VARCHAR(100) NOT NULL UNIQUE,
      schema_name VARCHAR(100) NOT NULL UNIQUE,
      is_active BOOLEAN NOT NULL DEFAULT true,
      plan VARCHAR(50) NOT NULL DEFAULT 'STANDARD',
      max_users INTEGER NOT NULL DEFAULT 50,
      enabled_modules JSONB DEFAULT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  console.log('✅ Tabela "tenants" criada/verificada no schema public.');

  // 2. Registrar tenant default se não existir
  const existing = await catalog.$queryRaw`
    SELECT id FROM tenants WHERE slug = 'default' LIMIT 1
  `;

  if (existing.length === 0) {
    // Detectar schema atual da DATABASE_URL
    const url = process.env.DATABASE_URL || '';
    const schemaMatch = url.match(/schema=([^&]+)/);
    const currentSchema = schemaMatch ? schemaMatch[1] : 'public';

    await catalog.$executeRaw`
      INSERT INTO tenants (id, name, slug, schema_name, is_active, plan, max_users, created_at, updated_at)
      VALUES (
        gen_random_uuid(),
        'Tenant Padrão',
        'default',
        ${currentSchema},
        true,
        'ENTERPRISE',
        999,
        NOW(),
        NOW()
      )
    `;
    console.log(`✅ Tenant "default" registrado (schema: ${currentSchema}).`);
  } else {
    console.log('ℹ️  Tenant "default" já existe.');
  }

  console.log('\n🎉 Catálogo configurado com sucesso!\n');

  await TenantManager.disconnectAll();
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Erro:', err);
  process.exit(1);
});
