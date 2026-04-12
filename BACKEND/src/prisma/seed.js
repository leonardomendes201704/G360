require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const {
  getManagerDefaultPermissions,
  getCollaboratorDefaultPermissions,
  getCabDefaultPermissions,
} = require('../config/rbac-default-permissions');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando Seed Básico (RBAC alinhado à rbac-matrix.json)...\n');

  const superAdminRole = await prisma.role.upsert({
    where: { name: 'Super Admin' },
    update: {},
    create: { name: 'Super Admin', description: 'Acesso total ao sistema' },
  });

  const managerRole = await prisma.role.upsert({
    where: { name: 'Manager' },
    update: {},
    create: { name: 'Manager', description: 'Gestor de Área' },
  });

  const collaboratorRole = await prisma.role.upsert({
    where: { name: 'Collaborator' },
    update: {},
    create: { name: 'Collaborator', description: 'Colaborador Padrão' },
  });

  const cabRole = await prisma.role.upsert({
    where: { name: 'CAB Member' },
    update: {},
    create: { name: 'CAB Member', description: 'Membro do CAB' },
  });

  await prisma.role.update({
    where: { id: managerRole.id },
    data: {
      permissions: {
        deleteMany: {},
        create: getManagerDefaultPermissions(),
      },
    },
  });

  await prisma.role.update({
    where: { id: cabRole.id },
    data: {
      permissions: {
        deleteMany: {},
        create: getCabDefaultPermissions(),
      },
    },
  });

  await prisma.role.update({
    where: { id: collaboratorRole.id },
    data: {
      permissions: {
        deleteMany: {},
        create: getCollaboratorDefaultPermissions(),
      },
    },
  });

  await prisma.tenant.upsert({
    where: { slug: 'master' },
    update: {},
    create: {
      name: 'Tenant Master (Admin)',
      slug: 'master',
      schemaName: 'public',
      isActive: true,
      plan: 'enterprise',
      maxUsers: 9999,
    },
  });

  const password = await bcrypt.hash('L89*Eb5v@', 10);

  await prisma.user.upsert({
    where: { email: 'admin@g360.com.br' },
    update: { password, isActive: true },
    create: {
      name: 'Administrador Global',
      email: 'admin@g360.com.br',
      password,
      isActive: true,
      roles: { connect: { id: superAdminRole.id } },
    },
  });

  console.log('✅ Perfis e permissões (matriz canônica) atualizados.');

  const { seedItilServiceCatalog } = require('../scripts/seed-itil-service-catalog');
  console.log('\n📚 Catálogo de serviços (ITIL)...');
  await seedItilServiceCatalog(prisma, { verbose: true });

  console.log('\n=============================================');
  console.log('✅ SEED BÁSICO EXECUTADO COM SUCESSO!');
  console.log('=============================================');
  console.log('Usuários Padrão Criados:');
  console.log('   admin@g360.com.br (Super Admin)');
  console.log('   Senha padrão: L89*Eb5v@');
  console.log('=============================================\n');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Erro ao executar seed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
