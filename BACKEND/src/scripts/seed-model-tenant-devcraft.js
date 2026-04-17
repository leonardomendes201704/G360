#!/usr/bin/env node
/**
 * Provisiona o tenant modelo **devcraft** (schema `tenant_devcraft`) com dados para testes:
 * - Schema + `prisma db push` (alinhado ao stack atual sem pasta migrations)
 * - Registo no catálogo `public.tenants`
 * - Seed base (roles + admin) via TenantService
 * - Integrações placeholder (Azure / LDAP desligadas)
 * - Catálogo ITIL, fornecedores, fluxo «3 áreas» (dept/CC, projetos, tarefas, incidentes, riscos, ativos, GMUD, despesas)
 *
 * Idempotente em reexecução: sincroniza schema (`db push`) e reexecuta seeds ITIL/fornecedores/3 áreas
 * (upserts). Não recria o admin nem roles se o tenant já existir.
 *
 * Uso:
 *   node src/scripts/seed-model-tenant-devcraft.js
 *   npm run seed:devcraft
 *
 * Variáveis opcionais:
 *   DEVCRAFT_ADMIN_EMAIL   (padrão: admin@devcraft.local)
 *   DEVCRAFT_ADMIN_PASSWORD (padrão: DevCraft@2026)
 */

const path = require('path');
const { execSync } = require('child_process');

require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const TenantManager = require('../config/tenant-manager');
const TenantRepository = require('../repositories/tenant.repository');
const TenantService = require('../services/tenant.service');
const { seedItilServiceCatalog } = require('./seed-itil-service-catalog');
const { seedSuppliers } = require('./seed-suppliers');
const { seedThreeAreasWorkflow } = require('./seed-three-areas-workflow');

const SLUG = 'devcraft';
const SCHEMA_NAME = 'tenant_devcraft';
const DISPLAY_NAME = 'DevCraft (modelo)';

function buildTenantDatabaseUrl(schemaName) {
  const baseUrl = process.env.DATABASE_URL.replace(/\?schema=[^&]*/, '').replace(/&schema=[^&]*/, '');
  const sep = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${sep}schema=${schemaName}`;
}

function runDbPush(schemaName) {
  const schemaPath = path.resolve(__dirname, '../prisma/schema.prisma');
  const cwd = path.resolve(__dirname, '../..');
  const url = buildTenantDatabaseUrl(schemaName);
  console.log(`\n🔄 prisma db push — schema "${schemaName}" ...\n`);
  execSync(`npx prisma db push --schema="${schemaPath}"`, {
    env: { ...process.env, DATABASE_URL: url },
    stdio: 'inherit',
    cwd,
  });
}

async function ensurePlaceholderIntegrations(prisma) {
  const pairs = [
    ['AZURE', 'Azure Active Directory'],
    ['LDAP', 'LDAP / Active Directory'],
  ];
  for (const [type, name] of pairs) {
    await prisma.integration.upsert({
      where: { type },
      update: {},
      create: { type, name, isEnabled: false, config: {} },
    });
  }
}

async function main() {
  const adminEmail = process.env.DEVCRAFT_ADMIN_EMAIL || 'admin@devcraft.local';
  const adminPassword = process.env.DEVCRAFT_ADMIN_PASSWORD || 'DevCraft@2026';

  const catalog = TenantManager.getCatalogClient();
  let row = await TenantRepository.findBySlug(catalog, SLUG);

  if (!row) {
    console.log(`\n🏗️  Criando tenant modelo ${SLUG} (${SCHEMA_NAME})...\n`);

    await catalog.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS "${SCHEMA_NAME}"`);

    runDbPush(SCHEMA_NAME);

    await TenantService.seedTenant(SCHEMA_NAME, adminEmail, adminPassword, 'DevCraft');

    const prisma = TenantManager.getClientForTenant(SCHEMA_NAME);
    await ensurePlaceholderIntegrations(prisma);

    await TenantRepository.create(catalog, {
      name: DISPLAY_NAME,
      slug: SLUG,
      schemaName: SCHEMA_NAME,
      plan: 'enterprise',
      maxUsers: 9999,
    });

    row = await TenantRepository.findBySlug(catalog, SLUG);
    console.log(`\n✅ Catálogo: tenant "${SLUG}" registado.\n`);
  } else {
    console.log(`\nℹ️  Tenant "${SLUG}" já existe — a sincronizar schema e reenriquecer dados...\n`);
    await TenantManager.evictClient(row.schemaName);
    runDbPush(row.schemaName);
    await TenantManager.evictClient(row.schemaName);
  }

  const schema = row ? row.schemaName : SCHEMA_NAME;
  const prisma = TenantManager.getClientForTenant(schema);

  console.log('\n📚 Catálogo ITIL...');
  await seedItilServiceCatalog(prisma, { verbose: true });

  console.log('\n🚚 Fornecedores...');
  const { count: supplierCount } = await seedSuppliers(prisma, { verbose: true });
  console.log(`   → ${supplierCount} fornecedor(es)\n`);

  console.log('🌱 Fluxo 3 áreas (projetos, incidentes, GMUD, despesas, etc.)...');
  const summary = await seedThreeAreasWorkflow(prisma, { verbose: true });

  await TenantManager.evictClient(schema);
  await TenantManager.disconnectAll();

  console.log('\n========================================');
  console.log('✅ Tenant modelo devcraft pronto.');
  console.log('========================================');
  console.log(`   Login: escolha o slug do tenant "${SLUG}" na tela de entrada.`);
  console.log(`   Admin: ${adminEmail}`);
  console.log(`   Senha admin: ${adminPassword}`);
  console.log(`   Senha utilizadores E2E (gestores/colaboradores): ${summary.password}`);
  console.log('   Contas E2E (exemplos):');
  for (const a of summary.areas) {
    console.log(`     - ${a.key}: gestor ${a.managerEmail} / colab. ${a.collaboratorEmail}`);
  }
  console.log('========================================\n');
}

main().catch(async (err) => {
  console.error('\n❌ Erro:', err);
  await TenantManager.disconnectAll();
  process.exit(1);
});
