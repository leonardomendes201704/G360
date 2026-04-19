/**
 * Seed de 3 áreas organizacionais (Department + CostCenter) com dados mínimos em vários módulos
 * para validar fluxo e isolamento por centro de custo / escopo de gestor.
 *
 * Idempotente: reexecutar atualiza os mesmos registros (upsert por email/código estáveis).
 *
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {{ verbose?: boolean, password?: string }} [options]
 */

const bcrypt = require('bcryptjs');
const { Prisma } = require('@prisma/client');
const IncidentRepository = require('../repositories/incident.repository');
const CorporateRiskRepository = require('../repositories/corporate-risk.repository');
const IncidentService = require('../services/incident.service');

const AREAS = [
  {
    key: 'TI',
    deptCode: 'TECNOL',
    deptName: 'Área Tecnologia (E2E)',
    ccCode: 'CCTECN',
    ccName: 'Centro de Custo TI — E2E',
    mgrEmail: 'e2e-seed-ti-mgr@g360.com.br',
    colEmail: 'e2e-seed-ti-col@g360.com.br',
    mgrName: 'E2E Gestor TI',
    colName: 'E2E Colaborador TI',
    projectCode: 'E2E-PRJ-TI',
    projectName: 'Projeto E2E — Área TI',
    incidentTitle: 'Incidente E2E — Área TI',
    riskTitle: 'Risco E2E — Área TI',
    assetCode: 'E2E-AST-TI',
    gmudCode: 'E2E-GMUD-TI-001',
    expenseDesc: 'Despesa E2E — TI',
  },
  {
    key: 'FIN',
    deptCode: 'FINANC',
    deptName: 'Área Financeiro (E2E)',
    ccCode: 'CCFINC',
    ccName: 'Centro de Custo Financeiro — E2E',
    mgrEmail: 'e2e-seed-fin-mgr@g360.com.br',
    colEmail: 'e2e-seed-fin-col@g360.com.br',
    mgrName: 'E2E Gestor Financeiro',
    colName: 'E2E Colaborador Financeiro',
    projectCode: 'E2E-PRJ-FIN',
    projectName: 'Projeto E2E — Área Financeiro',
    incidentTitle: 'Incidente E2E — Área Financeiro',
    riskTitle: 'Risco E2E — Área Financeiro',
    assetCode: 'E2E-AST-FIN',
    gmudCode: 'E2E-GMUD-FIN-001',
    expenseDesc: 'Despesa E2E — Financeiro',
  },
  {
    key: 'OPS',
    deptCode: 'OPERAC',
    deptName: 'Área Operações (E2E)',
    ccCode: 'CCOPER',
    ccName: 'Centro de Custo Operações — E2E',
    mgrEmail: 'e2e-seed-ops-mgr@g360.com.br',
    colEmail: 'e2e-seed-ops-col@g360.com.br',
    mgrName: 'E2E Gestor Operações',
    colName: 'E2E Colaborador Operações',
    projectCode: 'E2E-PRJ-OPS',
    projectName: 'Projeto E2E — Área Operações',
    incidentTitle: 'Incidente E2E — Área Operações',
    riskTitle: 'Risco E2E — Área Operações',
    assetCode: 'E2E-AST-OPS',
    gmudCode: 'E2E-GMUD-OPS-001',
    expenseDesc: 'Despesa E2E — Operações',
  },
];

async function ensureIncidentCategory(prisma) {
  let cat = await prisma.incidentCategory.findFirst({ where: { isActive: true } });
  if (!cat) {
    cat = await prisma.incidentCategory.create({
      data: {
        name: 'Categoria E2E — Geral',
        description: 'Seed E2E',
        slaResponse: 480,
        slaResolve: 1440,
        isActive: true,
      },
    });
  }
  return cat;
}

async function ensureAssetCategory(prisma) {
  let cat = await prisma.assetCategory.findFirst({ where: { type: 'HARDWARE' } });
  if (!cat) {
    cat = await prisma.assetCategory.create({
      data: { name: 'Hardware E2E', type: 'HARDWARE' },
    });
  }
  return cat;
}

async function upsertUserWithRoles(prisma, { email, name, password, departmentId, costCenterId, roleId }) {
  const hashed = await bcrypt.hash(password, 10);
  return prisma.user.upsert({
    where: { email },
    update: {
      name,
      password: hashed,
      departmentId,
      costCenterId,
      isActive: true,
      roles: { set: [{ id: roleId }] },
    },
    create: {
      email,
      name,
      password: hashed,
      departmentId,
      costCenterId,
      isActive: true,
      roles: { connect: { id: roleId } },
    },
  });
}

async function seedThreeAreasWorkflow(prisma, options = {}) {
  const { verbose = false, password = process.env.SEED_E2E_PASSWORD || process.env.E2E_PASSWORD || 'L89*Eb5v@' } = options;

  const log = (...a) => {
    if (verbose) console.log(...a);
  };

  const managerRole = await prisma.role.findFirst({ where: { name: 'Manager' } });
  const collabRole = await prisma.role.findFirst({ where: { name: 'Collaborator' } });
  if (!managerRole || !collabRole) {
    throw new Error('Roles Manager e Collaborator são obrigatórios. Rode o seed principal (npm run seed) antes.');
  }

  const incidentCat = await ensureIncidentCategory(prisma);
  const assetCat = await ensureAssetCategory(prisma);
  const supplier = await prisma.supplier.findFirst({ where: { isActive: true } });

  const summary = { areas: [], password };

  for (const area of AREAS) {
    const dept = await prisma.department.upsert({
      where: { code: area.deptCode },
      update: { name: area.deptName },
      create: {
        code: area.deptCode,
        name: area.deptName,
        budget: new Prisma.Decimal('500000'),
      },
    });

    const cc = await prisma.costCenter.upsert({
      where: { code: area.ccCode },
      update: {
        name: area.ccName,
        departmentId: dept.id,
        isActive: true,
      },
      create: {
        code: area.ccCode,
        name: area.ccName,
        departmentId: dept.id,
        isActive: true,
      },
    });

    const mgr = await upsertUserWithRoles(prisma, {
      email: area.mgrEmail,
      name: area.mgrName,
      password,
      departmentId: dept.id,
      costCenterId: cc.id,
      roleId: managerRole.id,
    });

    const col = await upsertUserWithRoles(prisma, {
      email: area.colEmail,
      name: area.colName,
      password,
      departmentId: dept.id,
      costCenterId: cc.id,
      roleId: collabRole.id,
    });

    await prisma.costCenter.update({
      where: { id: cc.id },
      data: { managerId: mgr.id },
    });

    await prisma.department.update({
      where: { id: dept.id },
      data: { directorId: mgr.id },
    });

    const project = await prisma.project.upsert({
      where: { code: area.projectCode },
      update: {
        name: area.projectName,
        departmentId: dept.id,
        costCenterId: cc.id,
        managerId: mgr.id,
        creatorId: mgr.id,
        type: 'INTERNO',
        status: 'IN_PROGRESS',
        approvalStatus: 'APPROVED',
        approvedAt: new Date(),
        approvedBy: mgr.id,
      },
      create: {
        code: area.projectCode,
        name: area.projectName,
        description: `Projeto de validação E2E — área ${area.key}`,
        type: 'INTERNO',
        status: 'IN_PROGRESS',
        priority: 'MEDIUM',
        departmentId: dept.id,
        costCenterId: cc.id,
        managerId: mgr.id,
        creatorId: mgr.id,
        approvalStatus: 'APPROVED',
        approvedAt: new Date(),
        approvedBy: mgr.id,
        progress: 10,
      },
    });

    await prisma.projectMember.upsert({
      where: {
        projectId_userId: { projectId: project.id, userId: col.id },
      },
      update: { role: 'MEMBER' },
      create: {
        projectId: project.id,
        userId: col.id,
        role: 'MEMBER',
      },
    });

    const ptaskTitle = `Tarefa projeto E2E ${area.key}`;
    const existingPtask = await prisma.projectTask.findFirst({
      where: { projectId: project.id, title: ptaskTitle },
    });
    if (!existingPtask) {
      await prisma.projectTask.create({
        data: {
          projectId: project.id,
          title: ptaskTitle,
          description: 'Seed E2E',
          assigneeId: col.id,
          status: 'TODO',
          priority: 'MEDIUM',
        },
      });
    }

    const taskTitle = `Tarefa operacional E2E — ${area.key}`;
    let opTask = await prisma.task.findFirst({
      where: { title: taskTitle },
    });
    if (!opTask) {
      opTask = await prisma.task.create({
        data: {
          title: taskTitle,
          description: 'Seed E2E — isolamento por CC',
          status: 'TODO',
          priority: 'MEDIUM',
          creatorId: mgr.id,
          assigneeId: col.id,
          isPersonal: false,
        },
      });
    }

    const incCode = await IncidentRepository.getNextCode(prisma);
    let incident = await prisma.incident.findFirst({
      where: { title: area.incidentTitle },
    });
    if (!incident) {
      const priority = IncidentService.calculatePriority('MEDIO', 'MEDIA');
      const slaDates = IncidentService.calculateSLADates(priority, new Date());
      incident = await IncidentRepository.create(prisma, {
        title: area.incidentTitle,
        description: 'Incidente criado pelo seed E2E de áreas.',
        categoryId: incidentCat.id,
        impact: 'MEDIO',
        urgency: 'MEDIA',
        status: 'OPEN',
        code: incCode,
        priority,
        reporterId: col.id,
        assigneeId: mgr.id,
        slaResponseDue: slaDates.slaResponseDue,
        slaResolveDue: slaDates.slaResolveDue,
      });
    }

    const riskCode = await CorporateRiskRepository.getNextCode(prisma);
    let risk = await prisma.corporateRisk.findFirst({
      where: { title: area.riskTitle },
    });
    if (!risk) {
      risk = await prisma.corporateRisk.create({
        data: {
          code: riskCode,
          title: area.riskTitle,
          description: 'Risco corporativo — seed E2E de isolamento por área.',
          category: 'TI',
          probability: 'MEDIA',
          impact: 'MEDIO',
          severity: 9,
          status: 'IDENTIFICADO',
          /** Owner = colaborador da área: escopo de risco por `ownerId` inclui o dono no mesmo CC. */
          ownerId: col.id,
          departmentId: dept.id,
          costCenterId: cc.id,
        },
      });
    } else {
      await prisma.corporateRisk.update({
        where: { id: risk.id },
        data: { ownerId: col.id, departmentId: dept.id, costCenterId: cc.id },
      });
    }

    const asset = await prisma.asset.upsert({
      where: { code: area.assetCode },
      update: {
        name: `Ativo E2E ${area.key}`,
        costCenterId: cc.id,
        categoryId: assetCat.id,
        supplierId: supplier?.id,
        status: 'PROPRIO',
        assignedTo: col.id,
      },
      create: {
        code: area.assetCode,
        name: `Ativo E2E ${area.key}`,
        description: 'Ativo para GMUD / escopo E2E',
        categoryId: assetCat.id,
        costCenterId: cc.id,
        supplierId: supplier?.id,
        status: 'PROPRIO',
        acquisitionValue: new Prisma.Decimal('2500'),
        location: `Matriz ${area.key}`,
        assignedTo: col.id,
      },
    });

    const existingGmud = await prisma.changeRequest.findFirst({
      where: { code: area.gmudCode },
    });
    if (!existingGmud) {
      const start = new Date();
      const end = new Date(start.getTime() + 48 * 60 * 60 * 1000);
      await prisma.changeRequest.create({
        data: {
          code: area.gmudCode,
          title: `GMUD E2E — ${area.key}`,
          description: 'Mudança de teste de isolamento por área.',
          justification: 'Validação E2E seed',
          type: 'EMERGENCIAL',
          riskLevel: 'BAIXO',
          impact: 'BAIXO',
          status: 'DRAFT',
          scheduledStart: start,
          scheduledEnd: end,
          requesterId: mgr.id,
          projectId: project.id,
          assets: { connect: [{ id: asset.id }] },
        },
      });
    }

    const existingExp = await prisma.expense.findFirst({
      where: { description: area.expenseDesc },
    });
    if (!existingExp) {
      await prisma.expense.create({
        data: {
          description: area.expenseDesc,
          type: 'OPERACIONAL',
          amount: new Prisma.Decimal('199.90'),
          date: new Date(),
          status: 'PREVISTO',
          costCenterId: cc.id,
          supplierId: supplier?.id,
          createdBy: mgr.id,
        },
      });
    }

    summary.areas.push({
      key: area.key,
      departmentId: dept.id,
      costCenterId: cc.id,
      managerEmail: area.mgrEmail,
      collaboratorEmail: area.colEmail,
      projectName: area.projectName,
      incidentTitle: area.incidentTitle,
    });

    log(`   ✓ Área ${area.key}: dept ${dept.code}, CC ${cc.code}, projeto ${project.code}`);
  }

  return summary;
}

module.exports = {
  seedThreeAreasWorkflow,
  AREAS,
};
