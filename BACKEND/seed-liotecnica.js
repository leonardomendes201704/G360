require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Criando Usuários de Teste para o Escopo Liotecnica...\n');

  // Senha unificada para os testes
  const password = await bcrypt.hash('Lio@2026', 10);

  // 1. Garantir que as Roles (Perfis) existem no banco
  const superAdminRole = await prisma.role.upsert({
    where: { name: 'Super Admin' },
    update: {},
    create: { name: 'Super Admin', description: 'Acesso total ao sistema' }
  });

  const managerRole = await prisma.role.upsert({
    where: { name: 'Manager' },
    update: {},
    create: { name: 'Manager', description: 'Gestor de Área' }
  });

  const collaboratorRole = await prisma.role.upsert({
    where: { name: 'Collaborator' },
    update: {},
    create: { name: 'Collaborator', description: 'Colaborador Padrão / Solicitante' }
  });

  // Novo perfil Agente ITIL
  const agentRole = await prisma.role.upsert({
    where: { name: 'AGENT' },
    update: {},
    create: { name: 'AGENT', description: 'Técnico N1/N2' }
  });

  console.log('✅ Perfis de Acesso validados.');

  // 2. Criar os Usuários da Liotecnica vinculando aos perfis

  const admin = await prisma.user.upsert({
    where: { email: 'admin@liotecnica.com.br' },
    update: { password, isActive: true, roles: { connect: [{ id: superAdminRole.id }] } },
    create: {
      name: 'Admin Liotecnica',
      email: 'admin@liotecnica.com.br',
      password,
      isActive: true,
      roles: { connect: { id: superAdminRole.id } }
    }
  });

  const gestor = await prisma.user.upsert({
    where: { email: 'gestor@liotecnica.com.br' },
    update: { password, isActive: true, roles: { connect: [{ id: managerRole.id }] } },
    create: {
      name: 'Gestor Diretor (CAB / PMO)',
      email: 'gestor@liotecnica.com.br',
      password,
      isActive: true,
      roles: { connect: { id: managerRole.id } }
    }
  });

  const agente = await prisma.user.upsert({
    where: { email: 'agente@liotecnica.com.br' },
    update: { password, isActive: true, roles: { connect: [{ id: agentRole.id }] } },
    create: {
      name: 'Técnico Service Desk (N1/N2)',
      email: 'agente@liotecnica.com.br',
      password,
      isActive: true,
      roles: { connect: { id: agentRole.id } }
    }
  });

  const solicitante = await prisma.user.upsert({
    where: { email: 'solicitante@liotecnica.com.br' },
    update: { password, isActive: true, roles: { connect: [{ id: collaboratorRole.id }] } },
    create: {
      name: 'João Comum (Requester)',
      email: 'solicitante@liotecnica.com.br',
      password,
      isActive: true,
      roles: { connect: { id: collaboratorRole.id } }
    }
  });

  console.log('✅ Usuários da Liotecnica criados com sucesso!');
  console.log('\n--- DADOS DE ACESSO ---');
  console.log('Senha para todos: Lio@2026');
  console.log(`1. Master: admin@liotecnica.com.br (${admin.name})`);
  console.log(`2. Gestor: gestor@liotecnica.com.br (${gestor.name})`);
  console.log(`3. Técnico: agente@liotecnica.com.br (${agente.name})`);
  console.log(`4. Padrão: solicitante@liotecnica.com.br (${solicitante.name})`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Erro na injeção:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
