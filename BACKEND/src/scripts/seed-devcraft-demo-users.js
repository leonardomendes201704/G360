/**
 * Utilizadores fixos para demos/E2E no tenant devcraft:
 * - Portal (solicitante): perfil Collaborator — HELPDESK CREATE/READ/MESSAGE entre outras permissões de colaborador.
 * - Agente (fila N1/N2): perfil Manager — HELPDESK completo (VIEW_QUEUE, UPDATE_STATUS, etc.).
 *
 * Idempotente: atualiza nome, senha (hash) e perfil em reexecução.
 */
const bcrypt = require('bcryptjs');

const DEFAULT_PORTAL = {
  email: 'portal.user@devcraft.local',
  password: 'DevCraft@Portal2026',
  name: 'DevCraft — Utilizador portal',
};

const DEFAULT_AGENT = {
  email: 'agente@devcraft.local',
  password: 'DevCraft@Agente2026',
  name: 'DevCraft — Agente helpdesk',
};

async function upsertDemoUser(prisma, { email, password, name, roleId }) {
  const hashedPassword = await bcrypt.hash(password, 10);
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        password: hashedPassword,
        name,
        isActive: true,
        authProvider: 'LOCAL',
        roles: { set: [{ id: roleId }] },
      },
    });
  } else {
    await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        isActive: true,
        authProvider: 'LOCAL',
        roles: { connect: { id: roleId } },
      },
    });
  }
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {{ verbose?: boolean }} [options]
 * @returns {Promise<{ portal: { email: string; password: string }; agent: { email: string; password: string } }>}
 */
async function seedDevCraftDemoUsers(prisma, options = {}) {
  const portalEmail = process.env.DEVCRAFT_PORTAL_EMAIL || DEFAULT_PORTAL.email;
  const portalPassword = process.env.DEVCRAFT_PORTAL_PASSWORD || DEFAULT_PORTAL.password;
  const agentEmail = process.env.DEVCRAFT_AGENT_EMAIL || DEFAULT_AGENT.email;
  const agentPassword = process.env.DEVCRAFT_AGENT_PASSWORD || DEFAULT_AGENT.password;

  const collaborator = await prisma.role.findUnique({ where: { name: 'Collaborator' } });
  const manager = await prisma.role.findUnique({ where: { name: 'Manager' } });
  if (!collaborator || !manager) {
    throw new Error(
      'Roles "Collaborator" e "Manager" são necessárias — execute o seed base do tenant antes (TenantService.seedTenant).'
    );
  }

  await upsertDemoUser(prisma, {
    email: portalEmail,
    password: portalPassword,
    name: DEFAULT_PORTAL.name,
    roleId: collaborator.id,
  });

  await upsertDemoUser(prisma, {
    email: agentEmail,
    password: agentPassword,
    name: DEFAULT_AGENT.name,
    roleId: manager.id,
  });

  if (options.verbose) {
    console.log('   Utilizador portal (Colaborador):');
    console.log(`     Email (login): ${portalEmail}`);
    console.log(`     Senha: ${portalPassword}`);
    console.log('   Agente / atendente (Gestor — fila helpdesk):');
    console.log(`     Email (login): ${agentEmail}`);
    console.log(`     Senha: ${agentPassword}`);
  }

  return {
    portal: { email: portalEmail, password: portalPassword },
    agent: { email: agentEmail, password: agentPassword },
  };
}

module.exports = { seedDevCraftDemoUsers, DEFAULT_PORTAL, DEFAULT_AGENT };
