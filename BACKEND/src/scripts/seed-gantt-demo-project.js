/**
 * Popula um projeto com tarefas para o Gantt (datas, dependências DAG, progresso)
 * e opcionalmente atas, custos, propostas, equipa e follow-ups (marcados `[Seed Demo]`).
 *
 * IMPORTANTE (multi-tenant): o script resolve o schema do tenant correto (ver README no ficheiro).
 *
 * Uso (pasta BACKEND):
 *   npm run seed:gantt-demo
 *   Só módulos (sem apagar/recriar tarefas Gantt):
 *   set GANTT_SEED_MODULES_ONLY=1 && npm run seed:gantt-demo
 *
 * Variáveis opcionais:
 *   GANTT_SEED_PROJECT_ID       — UUID do projeto (default abaixo)
 *   GANTT_SEED_SCHEMA           — forçar schema PostgreSQL (ex.: tenant_xyz)
 *   GANTT_SEED_TENANT_SLUG      — forçar tenant pelo slug (ex.: devcraft)
 *   GANTT_SEED_MODULES_ONLY=1   — apenas atas, custos, propostas, equipa, follow-up (+ riscos se vazio)
 */
require('dotenv').config();
const { Prisma } = require('@prisma/client');
const TenantManager = require('../config/tenant-manager');

const SEED = '[Seed Demo]';

const DEFAULT_PROJECT_ID = '859edbc6-3768-4717-9ebf-f80235f332c3';

function atNoon(date) {
  const d = new Date(date);
  d.setHours(12, 0, 0, 0);
  return d;
}

function getTimelineBase() {
  const t = new Date();
  const day = t.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(t);
  monday.setDate(t.getDate() + diff - 7);
  return atNoon(monday);
}

/**
 * @returns {Promise<{ prisma: import('@prisma/client').PrismaClient, schemaName: string, slug: string | null, projectName: string } | null>}
 */
async function resolvePrismaForProject(projectId) {
  const forcedSchema = process.env.GANTT_SEED_SCHEMA?.trim();
  if (forcedSchema) {
    const prisma = TenantManager.getClientForTenant(forcedSchema);
    const proj = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, name: true },
    });
    if (!proj) {
      console.error(`❌ Projeto ${projectId} não existe no schema "${forcedSchema}".`);
      return null;
    }
    console.log(`📌 Schema forçado por GANTT_SEED_SCHEMA: ${forcedSchema}`);
    return { prisma, schemaName: forcedSchema, slug: null, projectName: proj.name };
  }

  const forcedSlug = process.env.GANTT_SEED_TENANT_SLUG?.trim();
  if (forcedSlug) {
    const tenant = await TenantManager.getTenantBySlug(forcedSlug);
    if (!tenant) {
      console.error(`❌ Tenant "${forcedSlug}" não encontrado ou inativo.`);
      return null;
    }
    const prisma = TenantManager.getClientForTenant(tenant.schemaName);
    const proj = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, name: true },
    });
    if (!proj) {
      console.error(`❌ Projeto ${projectId} não existe no tenant "${forcedSlug}" (schema ${tenant.schemaName}).`);
      return null;
    }
    console.log(`📌 Tenant forçado por GANTT_SEED_TENANT_SLUG: ${forcedSlug} → ${tenant.schemaName}`);
    return { prisma, schemaName: tenant.schemaName, slug: forcedSlug, projectName: proj.name };
  }

  /** @type {{ prisma: import('@prisma/client').PrismaClient, schemaName: string, slug: string | null, projectName: string }[]} */
  const matches = [];

  const tenants = await TenantManager.getAllActiveTenants();
  for (const t of tenants) {
    const prisma = TenantManager.getClientForTenant(t.schemaName);
    const proj = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, name: true },
    });
    if (proj) {
      matches.push({
        prisma,
        schemaName: t.schemaName,
        slug: t.slug,
        projectName: proj.name,
      });
    }
  }

  const prismaDefault = TenantManager.getDefaultClient();
  const projDefault = await prismaDefault.project.findUnique({
    where: { id: projectId },
    select: { id: true, name: true },
  });
  if (projDefault) {
    const already = matches.some((m) => m.schemaName === 'public');
    if (!already) {
      matches.push({
        prisma: prismaDefault,
        schemaName: 'public',
        slug: null,
        projectName: projDefault.name,
      });
    }
  }

  if (matches.length === 0) return null;

  if (matches.length === 1) {
    const m = matches[0];
    console.log(
      `📌 Projeto encontrado no tenant "${m.slug || '—'}" (schema: ${m.schemaName}) — "${m.projectName}"`
    );
    return m;
  }

  console.warn(
    `⚠️  O ID existe em ${matches.length} schemas (ex.: seed antigo em public + projeto real noutro tenant).`
  );
  matches.forEach((m) => {
    console.warn(`   - schema=${m.schemaName} slug=${m.slug || 'n/a'} nome="${m.projectName}"`);
  });

  const notDemo = matches.find(
    (m) =>
      !String(m.projectName).toLowerCase().includes('demo gantt') &&
      !String(m.projectName).toLowerCase().includes('validação do gráfico')
  );
  const chosen = notDemo || matches[0];
  console.log(
    `📌 A usar schema "${chosen.schemaName}" (nome: "${chosen.projectName}"). Para forçar outro: GANTT_SEED_TENANT_SLUG ou GANTT_SEED_SCHEMA.`
  );
  return chosen;
}

async function seedDemoExtras(prisma, projectId, adminId) {
  const risks = await prisma.projectRisk.count({ where: { projectId } });
  if (risks === 0) {
    await prisma.projectRisk.createMany({
      data: [
        {
          projectId,
          description: 'Seed: dependência externa pode atrasar entregas.',
          impact: 'MEDIUM',
          probability: 'MEDIUM',
          status: 'OPEN',
          category: 'technical',
        },
        {
          projectId,
          description: 'Seed: disponibilidade da equipa em período de congelamento.',
          impact: 'LOW',
          probability: 'HIGH',
          status: 'OPEN',
          category: 'resource',
        },
      ],
    });
    console.log('   + 2 riscos de exemplo');
  }

  const members = await prisma.projectMember.count({ where: { projectId } });
  if (members === 0) {
    await prisma.projectMember.create({
      data: {
        projectId,
        userId: adminId,
        role: 'DEVELOPER',
      },
    });
    console.log('   + 1 membro de projeto (gestor seed)');
  }
}

/**
 * Fornecedores mínimos para propostas/custos (documento único por seed).
 */
async function ensureSeedSuppliers(prisma) {
  const mk = async (suffix, name) => {
    const document = `SEED859E${suffix}`;
    let s = await prisma.supplier.findUnique({ where: { document } });
    if (!s) {
      s = await prisma.supplier.create({
        data: {
          name,
          document,
          documentType: 'CNPJ',
          classification: 'Serviços',
          email: `seed859e${suffix.toLowerCase()}@demo.local`,
        },
      });
    }
    return s;
  };
  const sA = await mk('S01', `${SEED} Fornecedor Cloud`);
  const sB = await mk('S02', `${SEED} Fornecedor Serviços`);
  return { sA, sB };
}

/**
 * Atas, custos, propostas, equipa (vários perfis), follow-ups. Idempotente: se já existirem
 * registos com prefixo `[Seed Demo]` para este projeto, não duplica (exceto membros — upsert).
 */
async function seedProjectLifecycleModules(prisma, projectId, admin) {
  const addDays = (base, n) => {
    const x = new Date(base);
    x.setDate(x.getDate() + n);
    return atNoon(x);
  };
  const base = new Date();

  const hasSeedMinutes = (await prisma.meetingMinute.count({
    where: { projectId, title: { startsWith: SEED } },
  })) > 0;
  const hasSeedCosts = (await prisma.projectCost.count({
    where: { projectId, description: { startsWith: SEED } },
  })) > 0;
  const hasSeedProposals = (await prisma.projectProposal.count({
    where: { projectId, description: { startsWith: SEED } },
  })) > 0;
  const hasSeedFollowUps = (await prisma.projectFollowUp.count({
    where: { projectId, title: { startsWith: SEED } },
  })) > 0;

  const { sA, sB } = await ensureSeedSuppliers(prisma);

  let firstSeedProposalId = null;
  if (!hasSeedProposals) {
    const p1 = await prisma.projectProposal.create({
      data: {
        projectId,
        supplierId: sA.id,
        value: new Prisma.Decimal('42000.00'),
        status: 'APROVADA',
        description: `${SEED} Licenciamento cloud e suporte 12 meses`,
        category: 'Software',
        isWinner: true,
        notes: 'Proposta aprovada na reunião de steering.',
      },
    });
    await prisma.projectProposal.create({
      data: {
        projectId,
        supplierId: sB.id,
        value: new Prisma.Decimal('18500.50'),
        status: 'AGUARDANDO_APROVACAO',
        description: `${SEED} Consultoria especializada em integração`,
        category: 'Serviço',
        isWinner: false,
      },
    });
    firstSeedProposalId = p1.id;
    console.log('   + 2 propostas');
  } else {
    const existing = await prisma.projectProposal.findFirst({
      where: { projectId, description: { startsWith: SEED } },
      orderBy: { createdAt: 'asc' },
    });
    firstSeedProposalId = existing?.id;
  }

  if (!hasSeedCosts) {
    await prisma.projectCost.create({
      data: {
        projectId,
        description: `${SEED} Licenças e hospedagem (parcela 1)`,
        type: 'OPEX',
        amount: new Prisma.Decimal('12000.00'),
        date: addDays(base, -20),
        status: 'APROVADO',
        createdBy: admin.id,
        supplierId: sA.id,
        proposalId: firstSeedProposalId || undefined,
      },
    });
    await prisma.projectCost.create({
      data: {
        projectId,
        description: `${SEED} Infraestrutura e CAPEX equipamento`,
        type: 'CAPEX',
        amount: new Prisma.Decimal('35000.00'),
        date: addDays(base, -10),
        status: 'PREVISTO',
        createdBy: admin.id,
        supplierId: sB.id,
      },
    });
    await prisma.projectCost.create({
      data: {
        projectId,
        description: `${SEED} Despesa interna — deslocações e formação`,
        type: 'OPEX',
        amount: new Prisma.Decimal('3200.75'),
        date: addDays(base, -5),
        status: 'PAGO',
        createdBy: admin.id,
      },
    });
    console.log('   + 3 custos');
  }

  if (!hasSeedMinutes) {
    await prisma.meetingMinute.create({
      data: {
        projectId,
        title: `${SEED} Kickoff e planeamento`,
        date: addDays(base, -21),
        participants: 'Gestor do projeto; Tech lead; Product owner',
        fileUrl: '/uploads/seed/demo-kickoff.pdf',
        fileName: 'demo-kickoff.pdf',
        topics: ['Objetivos', 'Cronograma', 'Riscos iniciais'],
        status: 'APPROVED',
        duration: '1h30',
        location: 'Teams / Sala A',
        actions: { items: [{ label: 'Enviar ata assinada', done: false }] },
      },
    });
    await prisma.meetingMinute.create({
      data: {
        projectId,
        title: `${SEED} Revisão de sprint e custos`,
        date: addDays(base, -7),
        participants: 'Equipa técnica; Financeiro',
        fileUrl: '/uploads/seed/demo-sprint-review.pdf',
        fileName: 'demo-sprint-review.pdf',
        topics: ['Burn-down', 'Custos', 'Escopo'],
        status: 'DRAFT',
        duration: '45min',
        location: 'Presencial',
        actions: null,
      },
    });
    console.log('   + 2 atas');
  }

  if (!hasSeedFollowUps) {
    await prisma.projectFollowUp.create({
      data: {
        projectId,
        authorId: admin.id,
        assigneeId: admin.id,
        date: addDays(base, -14),
        status: 'OPEN',
        title: `${SEED} Acompanhamento quinzenal — status geral`,
        description: 'Revisão de marcos e dependências externas.',
        highlights: 'Cronograma dentro do esperado; atenção a integrações.',
        risks: 'Possível atraso em homologação se ambiente UAT não estiver disponível.',
        nextSteps: 'Agendar janela de testes com negócio.',
        type: 'TASK',
        priority: 'HIGH',
        dueDate: addDays(base, 3),
      },
    });
    await prisma.projectFollowUp.create({
      data: {
        projectId,
        authorId: admin.id,
        date: addDays(base, -3),
        status: 'OPEN',
        title: `${SEED} Follow-up de riscos e stakeholders`,
        description: 'Sincronização com área financeira.',
        highlights: 'Budget alinhado à fase atual.',
        nextSteps: 'Validar nota fiscal do fornecedor Cloud.',
        type: 'MEETING',
        priority: 'MEDIUM',
        dueDate: addDays(base, 10),
        meetingLink: 'https://example.com/meet/seed-demo',
      },
    });
    await prisma.projectFollowUp.create({
      data: {
        projectId,
        authorId: admin.id,
        date: addDays(base, -30),
        status: 'COMPLETED',
        title: `${SEED} Encerramento da fase de planeamento`,
        description: 'Checklist de saída da fase.',
        highlights: 'Entregáveis da fase aprovados.',
        completedAt: addDays(base, -28),
        type: 'TASK',
        priority: 'LOW',
      },
    });
    console.log('   + 3 follow-ups');
  }

  const users = await prisma.user.findMany({
    where: { isActive: true },
    orderBy: { createdAt: 'asc' },
    take: 6,
  });
  const roles = ['PROJECT_MANAGER', 'TECH_LEAD', 'DEVELOPER', 'ANALYST', 'DESIGNER', 'QA'];
  let addedMembers = 0;
  for (let i = 0; i < users.length; i += 1) {
    const u = users[i];
    try {
      await prisma.projectMember.upsert({
        where: { projectId_userId: { projectId, userId: u.id } },
        create: {
          projectId,
          userId: u.id,
          role: roles[i % roles.length],
        },
        update: {},
      });
      addedMembers += 1;
    } catch (e) {
      // ignore unique races
    }
  }
  console.log(`   + equipa: ${addedMembers} membro(s) garantidos (upsert por projeto+utilizador)`);
}

async function main() {
  const projectId = process.env.GANTT_SEED_PROJECT_ID || DEFAULT_PROJECT_ID;
  const modulesOnly =
    process.env.GANTT_SEED_MODULES_ONLY === '1' || process.env.GANTT_SEED_MODULES_ONLY === 'true';

  const resolved = await resolvePrismaForProject(projectId);
  if (!resolved) {
    console.error(`❌ Projeto ${projectId} não encontrado em nenhum tenant nem no schema padrão.`);
    process.exit(1);
  }

  const { prisma, schemaName, projectName } = resolved;

  const admin =
    (await prisma.user.findFirst({ where: { email: 'admin@g360.com.br' } })) ||
    (await prisma.user.findFirst({ orderBy: { createdAt: 'asc' } }));

  if (!admin) {
    console.error('❌ Nenhum utilizador neste schema. Execute primeiro: npm run seed');
    process.exit(1);
  }

  const base = getTimelineBase();
  const addDays = (d, n) => {
    const x = new Date(d);
    x.setDate(x.getDate() + n);
    return atNoon(x);
  };

  if (modulesOnly) {
    console.log('📦 Modo GANTT_SEED_MODULES_ONLY: atas, custos, propostas, equipa, follow-ups (+ riscos se vazio). Tarefas Gantt não alteradas.\n');
  } else {
    const projectStart = addDays(base, 0);
    const projectEnd = addDays(base, 56);

    await prisma.project.update({
      where: { id: projectId },
      data: {
        startDate: projectStart,
        endDate: projectEnd,
        progress: 35,
        approvalStatus: 'APPROVED',
        status: 'IN_PROGRESS',
        managerId: admin.id,
        techLeadId: admin.id,
      },
    });
    console.log(`📁 Projeto mantém o nome "${projectName}" — apenas atualizadas datas macro e estado.`);

    const deleted = await prisma.projectTask.deleteMany({ where: { projectId } });
    console.log(`🗑️  Removidas ${deleted.count} tarefas anteriores do projeto ${projectId}`);

    const specs = [
      { title: '1. Kickoff e alinhamento', startOffset: 0, endOffset: 3, status: 'DONE', priority: 'HIGH', progress: 100 },
      { title: '2. Requisitos e arquitetura', startOffset: 2, endOffset: 12, status: 'DONE', priority: 'HIGH', progress: 100 },
      { title: '3. API / Backend', startOffset: 11, endOffset: 28, status: 'IN_PROGRESS', priority: 'HIGH', progress: 45 },
      { title: '4. UI / Frontend', startOffset: 13, endOffset: 30, status: 'IN_PROGRESS', priority: 'MEDIUM', progress: 30 },
      { title: '5. Integração E2E', startOffset: 27, endOffset: 38, status: 'TODO', priority: 'HIGH', progress: 0 },
      { title: '6. Homologação com negócio', startOffset: 36, endOffset: 44, status: 'REVIEW', priority: 'MEDIUM', progress: 20 },
      { title: '7. Go-live e monitorização', startOffset: 43, endOffset: 49, status: 'TODO', priority: 'HIGH', progress: 0 },
      { title: '8. Backlog — melhorias futuras', startOffset: 40, endOffset: 55, status: 'BACKLOG', priority: 'LOW', progress: 0 },
    ];

    const created = [];
    for (const s of specs) {
      const row = await prisma.projectTask.create({
        data: {
          projectId,
          title: s.title,
          description: `Seed Gantt: ${s.title}`,
          status: s.status,
          priority: s.priority,
          progress: s.progress,
          startDate: addDays(base, s.startOffset),
          endDate: addDays(base, s.endOffset),
          assigneeId: admin.id,
          dependencies: [],
        },
      });
      created.push(row);
    }

    const [t0, t1, t2, t3, t4, t5, t6] = created;

    await prisma.projectTask.update({ where: { id: t1.id }, data: { dependencies: [t0.id] } });
    await prisma.projectTask.update({ where: { id: t2.id }, data: { dependencies: [t1.id] } });
    await prisma.projectTask.update({ where: { id: t3.id }, data: { dependencies: [t1.id] } });
    await prisma.projectTask.update({ where: { id: t4.id }, data: { dependencies: [t2.id, t3.id] } });
    await prisma.projectTask.update({ where: { id: t5.id }, data: { dependencies: [t4.id] } });
    await prisma.projectTask.update({ where: { id: t6.id }, data: { dependencies: [t5.id] } });

    console.log(`✅ ${created.length} tarefas criadas com dependências (tenant correto).`);
    console.log(`   Gantt: http://localhost:5176/projects/${projectId}/gantt`);
  }

  await seedDemoExtras(prisma, projectId, admin.id);
  console.log('📎 Módulos do projeto (atas, custos, propostas, equipa, follow-ups):');
  await seedProjectLifecycleModules(prisma, projectId, admin);

  if (schemaName && schemaName !== 'public') {
    await TenantManager.evictClient(schemaName);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
