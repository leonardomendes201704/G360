require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { execSync } = require('child_process');
const TenantManager = require('./src/config/tenant-manager');

const catalogClient = TenantManager.getCatalogClient(); // Schema public (Mestre)

async function main() {
  console.log('🚀 Iniciando Isolamento Multi-Tenant da Liotecnica...\n');

  // 1. Limpar Contas Vazadas no Schema Public (Para tirar o God Mode do Admin)
  await catalogClient.user.deleteMany({
    where: { email: { endsWith: '@liotecnica.com.br' } }
  });
  console.log('✅ Contas "God Mode" deletadas do Banco Mestre (Schema Public).');

  // 2. Registrar o Tenant no Painel de Empresas da G360
  await catalogClient.tenant.upsert({
    where: { slug: 'liotecnica' },
    update: {},
    create: {
      name: 'Liotecnica',
      slug: 'liotecnica',
      schemaName: 'liotecnica',
      isActive: true,
      plan: 'enterprise',
      maxUsers: 500
    }
  });
  console.log('✅ Contrato do Tenant Registrado.');

  // 3. Forçar o Prisma a Criar as Tabelas Físicas Particionadas para 'liotecnica'
  const dbUrl = process.env.DATABASE_URL.replace('?schema=public', '').replace('&schema=public', '');
  const separator = dbUrl.includes('?') ? '&' : '?';
  const finalUrl = `${dbUrl}${separator}schema=liotecnica`;
  
  console.log(`🔨 Construindo Paredes de Concreto no BD (schema: liotecnica)...`);
  execSync(`DATABASE_URL="${finalUrl}" npx prisma db push --skip-generate`, { stdio: 'inherit' });
  console.log('✅ Tabelas criadas no Schema Isolado!');

  // 4. Conectar Exclusivamente na Masmorra da Liotecnica
  const tenantClient = TenantManager.getClientForTenant('liotecnica');

  // 5. Clonar os Níveis de Acesso para esse Banco
  const superAdminRole = await tenantClient.role.upsert({ where: { name: 'Super Admin' }, update: {}, create: { name: 'Super Admin', description: 'Acesso total' } });
  const managerRole = await tenantClient.role.upsert({ where: { name: 'Manager' }, update: {}, create: { name: 'Manager', description: 'Gestor' } });
  const collabRole = await tenantClient.role.upsert({ where: { name: 'Collaborator' }, update: {}, create: { name: 'Collaborator', description: 'Comum' } });
  const agentRole = await tenantClient.role.upsert({ where: { name: 'AGENT' }, update: {}, create: { name: 'AGENT', description: 'Técnico ITIL' } });

  // 6. Injetar Usuários Presos Nesse Contêiner
  const password = await bcrypt.hash('Lio@2026', 10);
  await tenantClient.user.upsert({ where: { email: 'admin@liotecnica.com.br' }, update: { password, roles: { connect: [{ id: superAdminRole.id }] } }, create: { name: 'Admin Liotecnica', email: 'admin@liotecnica.com.br', password, isActive: true, roles: { connect: { id: superAdminRole.id } } } });
  await tenantClient.user.upsert({ where: { email: 'gestor@liotecnica.com.br' }, update: { password, roles: { connect: [{ id: managerRole.id }] } }, create: { name: 'Gestor Diretor', email: 'gestor@liotecnica.com.br', password, isActive: true, roles: { connect: { id: managerRole.id } } } });
  await tenantClient.user.upsert({ where: { email: 'agente@liotecnica.com.br' }, update: { password, roles: { connect: [{ id: agentRole.id }] } }, create: { name: 'Técnico N1', email: 'agente@liotecnica.com.br', password, isActive: true, roles: { connect: { id: agentRole.id } } } });
  await tenantClient.user.upsert({ where: { email: 'solicitante@liotecnica.com.br' }, update: { password, roles: { connect: [{ id: collabRole.id }] } }, create: { name: 'João Solicitante', email: 'solicitante@liotecnica.com.br', password, isActive: true, roles: { connect: { id: collabRole.id } } } });

  console.log('✅ Contas inseridas na masmorra da Liotecnica.');

  // 7. Catálogo ITIL completo (SLAs, categorias, serviços e formulários)
  const { seedItilServiceCatalog } = require('./src/scripts/seed-itil-service-catalog');
  await seedItilServiceCatalog(tenantClient, { verbose: true });

  console.log('✅ Catálogo de Serviços injetado com Sucesso!');
  console.log('\n===================================\n🚀 ISOLAMENTO CONCLUÍDO!');
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
