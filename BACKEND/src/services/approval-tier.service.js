const ENTITY_TYPES = {
  EXPENSE: 'EXPENSE',
  PROJECT_COST: 'PROJECT_COST',
  /** Baseline / liberação para execução (Project.approvalStatus) */
  PROJECT: 'PROJECT',
  MEETING_MINUTE: 'MEETING_MINUTE',
  PROPOSAL: 'PROPOSAL',
  BUDGET: 'BUDGET',
};

/**
 * GMUD / ChangeRequest não usa ApprovalTier: aprovadores vêm do CAB (perfil configurável)
 * e da tabela ChangeApprover — ver governance.config.js (CAB_MEMBER_ROLE_NAME).
 */

function amountInTierRange(amount, tier) {
  const a = Number(amount);
  if (Number.isNaN(a)) return false;
  if (tier.minAmount != null && a < Number(tier.minAmount)) return false;
  if (tier.maxAmount != null && a > Number(tier.maxAmount)) return false;
  return true;
}

/** Alçada sem faixa de valor aplica a qualquer montante; com faixa exige amount definido. */
function tierMatchesEntityAmount(tier, amountOrNull) {
  const unbounded = tier.minAmount == null && tier.maxAmount == null;
  if (unbounded) return true;
  if (amountOrNull == null) return false;
  return amountInTierRange(amountOrNull, tier);
}

function budgetTotalAmount(budget) {
  return Number(budget.totalOpex || 0) + Number(budget.totalCapex || 0);
}

function budgetItemCostCenterIds(budget) {
  const items = budget.items || [];
  return [...new Set(items.map((i) => i.costCenterId).filter(Boolean))];
}

async function isSuperAdminUser(prisma, userId) {
  const userWithRoles = await prisma.user.findUnique({
    where: { id: userId },
    include: { roles: true },
  });
  const names = userWithRoles?.roles?.map((r) => r.name) || [];
  return names.some((r) => {
    const x = String(r).toLowerCase();
    return x.includes('super admin') || x === 'superadmin';
  });
}

async function loadApproverContext(prisma, userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { roles: { select: { id: true } } },
  });
  if (!user) return null;

  const [managedCC, managedProjects] = await Promise.all([
    prisma.costCenter.findMany({ where: { managerId: userId }, select: { id: true } }),
    prisma.project.findMany({ where: { managerId: userId }, select: { id: true } }),
  ]);

  return {
    roleIds: user.roles.map((r) => r.id),
    managedCostCenterIds: managedCC.map((c) => c.id),
    managedProjectIds: managedProjects.map((p) => p.id),
  };
}

/**
 * Despesas que o usuário pode ver/aprovar na esteira.
 */
async function buildExpensePendingWhere(prisma, userId) {
  const ctx = await loadApproverContext(prisma, userId);
  if (!ctx) return { id: '__no_match__' };

  const orParts = [];

  if (ctx.managedCostCenterIds.length > 0) {
    orParts.push({ costCenterId: { in: ctx.managedCostCenterIds } });
  }

  const userTiers = await prisma.approvalTier.findMany({
    where: {
      entityType: ENTITY_TYPES.EXPENSE,
      isActive: true,
      roleId: { in: ctx.roleIds },
    },
  });

  for (const t of userTiers) {
    const band = {};
    if (t.minAmount != null) band.gte = t.minAmount;
    if (t.maxAmount != null) band.lte = t.maxAmount;
    const amountPart = Object.keys(band).length ? { amount: band } : {};

    if (t.globalScope) {
      orParts.push({ ...amountPart });
    } else if (ctx.managedCostCenterIds.length > 0) {
      orParts.push({
        costCenterId: { in: ctx.managedCostCenterIds },
        ...amountPart,
      });
    }
  }

  if (orParts.length === 0) {
    return { id: '__no_match__' };
  }

  return { status: 'AGUARDANDO_APROVACAO', OR: orParts };
}

/**
 * Custos de projeto pendentes visíveis ao usuário.
 */
async function buildProjectCostPendingWhere(prisma, userId) {
  const ctx = await loadApproverContext(prisma, userId);
  if (!ctx) return { id: '__no_match__' };

  const orParts = [];

  if (ctx.managedProjectIds.length > 0) {
    orParts.push({ projectId: { in: ctx.managedProjectIds } });
  }

  const userTiers = await prisma.approvalTier.findMany({
    where: {
      entityType: ENTITY_TYPES.PROJECT_COST,
      isActive: true,
      roleId: { in: ctx.roleIds },
    },
  });

  for (const t of userTiers) {
    const band = {};
    if (t.minAmount != null) band.gte = t.minAmount;
    if (t.maxAmount != null) band.lte = t.maxAmount;
    const amountPart = Object.keys(band).length ? { amount: band } : {};

    if (t.globalScope) {
      orParts.push({ ...amountPart });
    } else if (ctx.managedProjectIds.length > 0) {
      orParts.push({
        projectId: { in: ctx.managedProjectIds },
        ...amountPart,
      });
    }
  }

  if (orParts.length === 0) {
    return { id: '__no_match__' };
  }

  return { status: 'AGUARDANDO_APROVACAO', OR: orParts };
}

async function userCanApproveExpense(prisma, userId, expense) {
  if (!expense || expense.status !== 'AGUARDANDO_APROVACAO') return false;
  const ctx = await loadApproverContext(prisma, userId);
  if (!ctx) return false;

  if (ctx.managedCostCenterIds.includes(expense.costCenterId)) return true;

  const tiers = await prisma.approvalTier.findMany({
    where: {
      entityType: ENTITY_TYPES.EXPENSE,
      isActive: true,
      roleId: { in: ctx.roleIds },
    },
  });

  for (const t of tiers) {
    if (!amountInTierRange(expense.amount, t)) continue;
    if (t.globalScope) return true;
    if (ctx.managedCostCenterIds.includes(expense.costCenterId)) return true;
  }
  return false;
}

async function userCanApproveProjectCost(prisma, userId, cost) {
  if (!cost || cost.status !== 'AGUARDANDO_APROVACAO') return false;
  const ctx = await loadApproverContext(prisma, userId);
  if (!ctx) return false;

  if (ctx.managedProjectIds.includes(cost.projectId)) return true;

  const tiers = await prisma.approvalTier.findMany({
    where: {
      entityType: ENTITY_TYPES.PROJECT_COST,
      isActive: true,
      roleId: { in: ctx.roleIds },
    },
  });

  for (const t of tiers) {
    if (!amountInTierRange(cost.amount, t)) continue;
    if (t.globalScope) return true;
    if (ctx.managedProjectIds.includes(cost.projectId)) return true;
  }
  return false;
}

async function buildProjectBaselinePendingWhere(prisma, userId, isSuperAdmin) {
  if (isSuperAdmin) {
    return { approvalStatus: 'PENDING_APPROVAL' };
  }
  const ctx = await loadApproverContext(prisma, userId);
  if (!ctx) return { id: '__no_match__' };

  const orParts = [];

  orParts.push({
    approvalStatus: 'PENDING_APPROVAL',
    costCenter: { managerId: userId },
  });

  const userTiers = await prisma.approvalTier.findMany({
    where: {
      entityType: ENTITY_TYPES.PROJECT,
      isActive: true,
      roleId: { in: ctx.roleIds },
    },
  });

  for (const t of userTiers) {
    const band = {};
    if (t.minAmount != null) band.gte = t.minAmount;
    if (t.maxAmount != null) band.lte = t.maxAmount;
    const budgetPart = Object.keys(band).length ? { budget: band } : {};

    if (t.globalScope) {
      orParts.push({ approvalStatus: 'PENDING_APPROVAL', ...budgetPart });
    } else if (ctx.managedCostCenterIds.length > 0) {
      orParts.push({
        approvalStatus: 'PENDING_APPROVAL',
        costCenterId: { in: ctx.managedCostCenterIds },
        ...budgetPart,
      });
    }
  }

  if (orParts.length === 0) return { id: '__no_match__' };
  return { OR: orParts };
}

async function userCanApproveProjectBaseline(prisma, userId, project) {
  if (!project || project.approvalStatus !== 'PENDING_APPROVAL') return false;
  if (await isSuperAdminUser(prisma, userId)) return true;

  const ccMgr = project.costCenter?.managerId;
  if (ccMgr && ccMgr === userId) return true;
  if (ccMgr == null) return true;

  const ctx = await loadApproverContext(prisma, userId);
  if (!ctx) return false;

  const budgetAmt = project.budget != null ? project.budget : null;
  const tiers = await prisma.approvalTier.findMany({
    where: {
      entityType: ENTITY_TYPES.PROJECT,
      isActive: true,
      roleId: { in: ctx.roleIds },
    },
  });

  for (const t of tiers) {
    if (!tierMatchesEntityAmount(t, budgetAmt)) continue;
    if (t.globalScope) return true;
    if (project.costCenterId && ctx.managedCostCenterIds.includes(project.costCenterId)) return true;
  }
  return false;
}

async function buildMeetingMinutePendingWhere(prisma, userId, isSuperAdmin) {
  if (isSuperAdmin) {
    return { status: 'PENDING' };
  }
  const ctx = await loadApproverContext(prisma, userId);
  if (!ctx) return { id: '__no_match__' };

  const orParts = [];

  if (ctx.managedProjectIds.length > 0) {
    orParts.push({ projectId: { in: ctx.managedProjectIds }, status: 'PENDING' });
  }

  const userTiers = await prisma.approvalTier.findMany({
    where: {
      entityType: ENTITY_TYPES.MEETING_MINUTE,
      isActive: true,
      roleId: { in: ctx.roleIds },
    },
  });

  for (const t of userTiers) {
    if (!tierMatchesEntityAmount(t, null)) continue;
    if (t.globalScope) {
      orParts.push({ status: 'PENDING' });
    } else if (ctx.managedProjectIds.length > 0) {
      orParts.push({ projectId: { in: ctx.managedProjectIds }, status: 'PENDING' });
    }
  }

  if (orParts.length === 0) return { id: '__no_match__' };
  return { OR: orParts };
}

async function userCanApproveMeetingMinute(prisma, userId, minute) {
  if (!minute || minute.status !== 'PENDING') return false;
  if (await isSuperAdminUser(prisma, userId)) return true;

  const ctx = await loadApproverContext(prisma, userId);
  if (!ctx) return false;

  if (ctx.managedProjectIds.includes(minute.projectId)) return true;

  const tiers = await prisma.approvalTier.findMany({
    where: {
      entityType: ENTITY_TYPES.MEETING_MINUTE,
      isActive: true,
      roleId: { in: ctx.roleIds },
    },
  });

  for (const t of tiers) {
    if (!tierMatchesEntityAmount(t, null)) continue;
    if (t.globalScope) return true;
    if (ctx.managedProjectIds.includes(minute.projectId)) return true;
  }
  return false;
}

async function buildProposalPendingWhere(prisma, userId, isSuperAdmin) {
  if (isSuperAdmin) {
    return { status: 'AGUARDANDO_APROVACAO' };
  }
  const ctx = await loadApproverContext(prisma, userId);
  if (!ctx) return { id: '__no_match__' };

  const orParts = [];

  if (ctx.managedProjectIds.length > 0) {
    orParts.push({
      projectId: { in: ctx.managedProjectIds },
      status: 'AGUARDANDO_APROVACAO',
    });
  }

  const userTiers = await prisma.approvalTier.findMany({
    where: {
      entityType: ENTITY_TYPES.PROPOSAL,
      isActive: true,
      roleId: { in: ctx.roleIds },
    },
  });

  for (const t of userTiers) {
    const band = {};
    if (t.minAmount != null) band.gte = t.minAmount;
    if (t.maxAmount != null) band.lte = t.maxAmount;
    const valuePart = Object.keys(band).length ? { value: band } : {};

    if (t.globalScope) {
      orParts.push({ status: 'AGUARDANDO_APROVACAO', ...valuePart });
    } else if (ctx.managedProjectIds.length > 0) {
      orParts.push({
        projectId: { in: ctx.managedProjectIds },
        status: 'AGUARDANDO_APROVACAO',
        ...valuePart,
      });
    }
  }

  if (orParts.length === 0) return { id: '__no_match__' };
  return { OR: orParts };
}

async function userCanApproveProposal(prisma, userId, proposal) {
  if (!proposal || proposal.status !== 'AGUARDANDO_APROVACAO') return false;
  if (await isSuperAdminUser(prisma, userId)) return true;

  const ctx = await loadApproverContext(prisma, userId);
  if (!ctx) return false;

  if (proposal.projectId && ctx.managedProjectIds.includes(proposal.projectId)) return true;

  const tiers = await prisma.approvalTier.findMany({
    where: {
      entityType: ENTITY_TYPES.PROPOSAL,
      isActive: true,
      roleId: { in: ctx.roleIds },
    },
  });

  for (const t of tiers) {
    if (!tierMatchesEntityAmount(t, proposal.value)) continue;
    if (t.globalScope) return true;
    if (proposal.projectId && ctx.managedProjectIds.includes(proposal.projectId)) return true;
  }
  return false;
}

async function userCanApproveBudget(prisma, userId, budget) {
  if (!budget) return false;
  const st = budget.status;
  if (st === 'APPROVED') return false;
  if (st !== 'DRAFT' && st !== 'PENDING_APPROVAL') return false;

  if (await isSuperAdminUser(prisma, userId)) return true;

  const allTiers = await prisma.approvalTier.findMany({
    where: { entityType: ENTITY_TYPES.BUDGET, isActive: true },
  });
  if (allTiers.length === 0) return true;

  const ctx = await loadApproverContext(prisma, userId);
  if (!ctx) return false;

  const amount = budgetTotalAmount(budget);
  const itemCcs = budgetItemCostCenterIds(budget);

  const tiers = await prisma.approvalTier.findMany({
    where: {
      entityType: ENTITY_TYPES.BUDGET,
      isActive: true,
      roleId: { in: ctx.roleIds },
    },
  });

  for (const t of tiers) {
    if (!tierMatchesEntityAmount(t, amount)) continue;
    if (t.globalScope) return true;
    if (itemCcs.some((cc) => ctx.managedCostCenterIds.includes(cc))) return true;
  }
  return false;
}

async function filterBudgetsPendingForUser(prisma, userId, budgets) {
  const out = [];
  for (const b of budgets) {
    if (await userCanApproveBudget(prisma, userId, b)) out.push(b);
  }
  return out;
}

async function collectUserIdsForProjectBaselineTiers(prisma, project) {
  const tiers = await prisma.approvalTier.findMany({
    where: { entityType: ENTITY_TYPES.PROJECT, isActive: true },
  });
  const budgetAmt = project.budget != null ? project.budget : null;
  const matching = tiers.filter((t) => tierMatchesEntityAmount(t, budgetAmt));
  if (matching.length === 0) return [];

  const ids = new Set();
  for (const t of matching) {
    const where = {
      isActive: true,
      roles: { some: { id: t.roleId } },
    };
    if (!t.globalScope && project.costCenterId) {
      where.managedCostCenters = { some: { id: project.costCenterId } };
    }
    if (!t.globalScope && !project.costCenterId) continue;
    const users = await prisma.user.findMany({ where, select: { id: true } });
    users.forEach((u) => ids.add(u.id));
  }
  return [...ids];
}

async function notifyProjectBaselineTierApprovers(prisma, project, options = {}) {
  const NotificationService = require('./notification.service');
  const EmailTemplateService = require('./email-template.service');
  const logger = require('../config/logger');

  const excludeIds = new Set(
    [project.creatorId, options.alreadyNotifiedManagerId].filter(Boolean)
  );

  let userIds;
  try {
    userIds = await collectUserIdsForProjectBaselineTiers(prisma, project);
  } catch (e) {
    logger.error('[ApprovalTier] Falha ao resolver destinatários de alçada (projeto):', e.message);
    return;
  }

  for (const uid of userIds) {
    if (excludeIds.has(uid)) continue;
    try {
      const u = await prisma.user.findUnique({ where: { id: uid }, select: { email: true, name: true } });
      await NotificationService.createNotification(prisma, {
        userId: uid,
        title: 'Projeto pendente (alçada)',
        message: `O projeto "${project.name}" (${project.code || '—'}) foi submetido e se enquadra na sua alçada de aprovação.`,
        type: 'INFO',
        link: '/approvals?tab=project',
        eventCode: 'APPROVAL_TIER_PROJECT',
        entityType: 'Project',
        entityId: project.id,
        dedupeKey: `tier-proj-${project.id}-${uid}`,
        category: 'APPROVALS',
        mail: u?.email
          ? {
              to: u.email,
              subject: `[Aprovação] Projeto ${project.code || project.name}`,
              html: EmailTemplateService.getSimpleAlertEmail(
                u.name,
                'Projeto na sua alçada',
                `<p>O projeto <strong>${project.name}</strong> (${project.code || '—'}) foi submetido e requer a sua aprovação.</p>`,
                '/approvals?tab=project'
              ),
              type: 'APPROVAL_TIER_PROJECT',
              module: 'APPROVALS'
            }
          : null
      });
    } catch (e) {
      logger.error(`[ApprovalTier] Notificação projeto falhou para usuário ${uid}:`, e.message);
    }
  }
}

async function collectUserIdsForMeetingMinuteTiers(prisma, minute) {
  const tiers = await prisma.approvalTier.findMany({
    where: { entityType: ENTITY_TYPES.MEETING_MINUTE, isActive: true },
  });
  const matching = tiers.filter((t) => tierMatchesEntityAmount(t, null));
  if (matching.length === 0) return [];

  const ids = new Set();
  for (const t of matching) {
    const where = {
      isActive: true,
      roles: { some: { id: t.roleId } },
    };
    if (!t.globalScope) {
      where.managedProjects = { some: { id: minute.projectId } };
    }
    const users = await prisma.user.findMany({ where, select: { id: true } });
    users.forEach((u) => ids.add(u.id));
  }
  return [...ids];
}

async function notifyMeetingMinuteTierApprovers(prisma, minute, options = {}) {
  const NotificationService = require('./notification.service');
  const EmailTemplateService = require('./email-template.service');
  const logger = require('../config/logger');

  const excludeIds = new Set([options.alreadyNotifiedManagerId].filter(Boolean));

  let userIds;
  try {
    userIds = await collectUserIdsForMeetingMinuteTiers(prisma, minute);
  } catch (e) {
    logger.error('[ApprovalTier] Falha ao resolver destinatários de alçada (ata):', e.message);
    return;
  }

  for (const uid of userIds) {
    if (excludeIds.has(uid)) continue;
    try {
      const u = await prisma.user.findUnique({ where: { id: uid }, select: { email: true, name: true } });
      await NotificationService.createNotification(prisma, {
        userId: uid,
        title: 'Ata pendente (alçada)',
        message: `A ata "${minute.title}" foi submetida e se enquadra na sua alçada de aprovação.`,
        type: 'INFO',
        link: '/approvals?tab=minute',
        eventCode: 'APPROVAL_TIER_MINUTE',
        entityType: 'MeetingMinute',
        entityId: minute.id,
        dedupeKey: `tier-min-${minute.id}-${uid}`,
        category: 'APPROVALS',
        mail: u?.email
          ? {
              to: u.email,
              subject: '[Aprovação] Ata de reunião pendente',
              html: EmailTemplateService.getSimpleAlertEmail(
                u.name,
                'Ata na sua alçada',
                `<p>A ata <strong>${minute.title}</strong> foi submetida e requer a sua aprovação.</p>`,
                '/approvals?tab=minute'
              ),
              type: 'APPROVAL_TIER_MINUTE',
              module: 'APPROVALS'
            }
          : null
      });
    } catch (e) {
      logger.error(`[ApprovalTier] Notificação ata falhou para usuário ${uid}:`, e.message);
    }
  }
}

async function collectUserIdsForProposalTiers(prisma, proposal) {
  const tiers = await prisma.approvalTier.findMany({
    where: { entityType: ENTITY_TYPES.PROPOSAL, isActive: true },
  });
  const matching = tiers.filter((t) => tierMatchesEntityAmount(t, proposal.value));
  if (matching.length === 0) return [];

  const ids = new Set();
  for (const t of matching) {
    const where = {
      isActive: true,
      roles: { some: { id: t.roleId } },
    };
    if (!t.globalScope && proposal.projectId) {
      where.managedProjects = { some: { id: proposal.projectId } };
    }
    if (!t.globalScope && !proposal.projectId) continue;
    const users = await prisma.user.findMany({ where, select: { id: true } });
    users.forEach((u) => ids.add(u.id));
  }
  return [...ids];
}

async function notifyProposalTierApprovers(prisma, proposal, options = {}) {
  const NotificationService = require('./notification.service');
  const EmailTemplateService = require('./email-template.service');
  const logger = require('../config/logger');

  const excludeIds = new Set([options.alreadyNotifiedManagerId].filter(Boolean));

  let userIds;
  try {
    userIds = await collectUserIdsForProposalTiers(prisma, proposal);
  } catch (e) {
    logger.error('[ApprovalTier] Falha ao resolver destinatários de alçada (proposta):', e.message);
    return;
  }

  const valStr = Number(proposal.value).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

  for (const uid of userIds) {
    if (excludeIds.has(uid)) continue;
    try {
      const u = await prisma.user.findUnique({ where: { id: uid }, select: { email: true, name: true } });
      await NotificationService.createNotification(prisma, {
        userId: uid,
        title: 'Proposta pendente (alçada)',
        message: `Uma proposta de ${valStr} foi submetida e se enquadra na sua alçada de aprovação.`,
        type: 'INFO',
        link: '/approvals?tab=proposal',
        eventCode: 'APPROVAL_TIER_PROPOSAL',
        entityType: 'Proposal',
        entityId: proposal.id,
        dedupeKey: `tier-prop-${proposal.id}-${uid}`,
        category: 'APPROVALS',
        mail: u?.email
          ? {
              to: u.email,
              subject: '[Aprovação] Proposta pendente',
              html: EmailTemplateService.getSimpleAlertEmail(
                u.name,
                'Proposta na sua alçada',
                `<p>Uma proposta de <strong>${valStr}</strong> foi submetida e requer a sua aprovação.</p>`,
                '/approvals?tab=proposal'
              ),
              type: 'APPROVAL_TIER_PROPOSAL',
              module: 'APPROVALS'
            }
          : null
      });
    } catch (e) {
      logger.error(`[ApprovalTier] Notificação proposta falhou para usuário ${uid}:`, e.message);
    }
  }
}

async function collectUserIdsForBudgetTiers(prisma, budget) {
  const tiers = await prisma.approvalTier.findMany({
    where: { entityType: ENTITY_TYPES.BUDGET, isActive: true },
  });
  const amount = budgetTotalAmount(budget);
  const matching = tiers.filter((t) => tierMatchesEntityAmount(t, amount));
  if (matching.length === 0) return [];

  const itemCcs = budgetItemCostCenterIds(budget);
  const ids = new Set();
  for (const t of matching) {
    const where = {
      isActive: true,
      roles: { some: { id: t.roleId } },
    };
    if (!t.globalScope) {
      if (itemCcs.length === 0) continue;
      where.managedCostCenters = { some: { id: { in: itemCcs } } };
    }
    const users = await prisma.user.findMany({ where, select: { id: true } });
    users.forEach((u) => ids.add(u.id));
  }
  return [...ids];
}

async function notifyBudgetTierApprovers(prisma, budget, options = {}) {
  const NotificationService = require('./notification.service');
  const EmailTemplateService = require('./email-template.service');
  const logger = require('../config/logger');

  const excludeIds = new Set([options.alreadyNotifiedUserId].filter(Boolean));

  let userIds;
  try {
    userIds = await collectUserIdsForBudgetTiers(prisma, budget);
  } catch (e) {
    logger.error('[ApprovalTier] Falha ao resolver destinatários de alçada (orçamento):', e.message);
    return;
  }

  for (const uid of userIds) {
    if (excludeIds.has(uid)) continue;
    try {
      const u = await prisma.user.findUnique({ where: { id: uid }, select: { email: true, name: true } });
      await NotificationService.createNotification(prisma, {
        userId: uid,
        title: 'Orçamento pendente (alçada)',
        message: `O orçamento "${budget.name}" aguarda aprovação e se enquadra na sua alçada.`,
        type: 'INFO',
        link: '/approvals?tab=budget',
        eventCode: 'APPROVAL_TIER_BUDGET',
        entityType: 'Budget',
        entityId: budget.id,
        dedupeKey: `tier-bud-${budget.id}-${uid}`,
        category: 'APPROVALS',
        mail: u?.email
          ? {
              to: u.email,
              subject: `[Aprovação] Orçamento: ${budget.name}`,
              html: EmailTemplateService.getSimpleAlertEmail(
                u.name,
                'Orçamento na sua alçada',
                `<p>O orçamento <strong>${budget.name}</strong> aguarda a sua aprovação.</p>`,
                '/approvals?tab=budget'
              ),
              type: 'APPROVAL_TIER_BUDGET',
              module: 'APPROVALS'
            }
          : null
      });
    } catch (e) {
      logger.error(`[ApprovalTier] Notificação orçamento falhou para usuário ${uid}:`, e.message);
    }
  }
}

async function collectUserIdsForExpenseTiers(prisma, expense) {
  const tiers = await prisma.approvalTier.findMany({
    where: { entityType: ENTITY_TYPES.EXPENSE, isActive: true },
  });
  const matching = tiers.filter((t) => amountInTierRange(expense.amount, t));
  if (matching.length === 0) return [];

  const ids = new Set();
  for (const t of matching) {
    const where = {
      isActive: true,
      roles: { some: { id: t.roleId } },
    };
    if (!t.globalScope) {
      where.managedCostCenters = { some: { id: expense.costCenterId } };
    }
    const users = await prisma.user.findMany({ where, select: { id: true } });
    users.forEach((u) => ids.add(u.id));
  }
  return [...ids];
}

/**
 * Notifica usuários com perfil de alçada quando uma despesa é submetida.
 * @param {{ alreadyNotifiedManagerId?: string }} options — evita notificação duplicada ao gestor do CC (já avisado pelo fluxo legado)
 */
async function notifyExpenseTierApprovers(prisma, expense, options = {}) {
  const NotificationService = require('./notification.service');
  const EmailTemplateService = require('./email-template.service');
  const logger = require('../config/logger');

  const excludeIds = new Set(
    [expense.createdBy, options.alreadyNotifiedManagerId].filter(Boolean)
  );

  let userIds;
  try {
    userIds = await collectUserIdsForExpenseTiers(prisma, expense);
  } catch (e) {
    logger.error('[ApprovalTier] Falha ao resolver destinatários de alçada (despesa):', e.message);
    return;
  }

  const amountStr = Number(expense.amount).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

  for (const uid of userIds) {
    if (excludeIds.has(uid)) continue;
    try {
      const u = await prisma.user.findUnique({ where: { id: uid }, select: { email: true, name: true } });
      await NotificationService.createNotification(prisma, {
        userId: uid,
        title: 'Despesa pendente (alçada)',
        message: `Uma despesa de ${amountStr} foi submetida e se enquadra na sua alçada de aprovação.`,
        type: 'INFO',
        link: '/approvals?tab=expense',
        eventCode: 'APPROVAL_TIER_EXPENSE',
        entityType: 'Expense',
        entityId: expense.id,
        dedupeKey: `tier-exp-${expense.id}-${uid}`,
        category: 'APPROVALS',
        mail: u?.email
          ? {
              to: u.email,
              subject: '[Aprovação] Despesa na sua alçada',
              html: EmailTemplateService.getSimpleAlertEmail(
                u.name,
                'Despesa na sua alçada',
                `<p>Uma despesa de <strong>${amountStr}</strong> foi submetida e requer a sua aprovação.</p>`,
                '/approvals?tab=expense'
              ),
              type: 'APPROVAL_TIER_EXPENSE',
              module: 'APPROVALS'
            }
          : null
      });
    } catch (e) {
      logger.error(`[ApprovalTier] Notificação despesa falhou para usuário ${uid}:`, e.message);
    }
  }
}

async function collectUserIdsForProjectCostTiers(prisma, cost) {
  const tiers = await prisma.approvalTier.findMany({
    where: { entityType: ENTITY_TYPES.PROJECT_COST, isActive: true },
  });
  const matching = tiers.filter((t) => amountInTierRange(cost.amount, t));
  if (matching.length === 0) return [];

  const ids = new Set();
  for (const t of matching) {
    const where = {
      isActive: true,
      roles: { some: { id: t.roleId } },
    };
    if (!t.globalScope) {
      where.managedProjects = { some: { id: cost.projectId } };
    }
    const users = await prisma.user.findMany({ where, select: { id: true } });
    users.forEach((u) => ids.add(u.id));
  }
  return [...ids];
}

/**
 * Notifica usuários com perfil de alçada quando um custo de projeto é submetido.
 * @param {{ project?: object, alreadyNotifiedManagerId?: string }} options
 */
async function notifyProjectCostTierApprovers(prisma, cost, options = {}) {
  const NotificationService = require('./notification.service');
  const EmailTemplateService = require('./email-template.service');
  const logger = require('../config/logger');

  const excludeIds = new Set(
    [cost.createdBy, options.alreadyNotifiedManagerId].filter(Boolean)
  );

  let userIds;
  try {
    userIds = await collectUserIdsForProjectCostTiers(prisma, cost);
  } catch (e) {
    logger.error('[ApprovalTier] Falha ao resolver destinatários de alçada (custo projeto):', e.message);
    return;
  }

  const project =
    options.project ||
    (await prisma.project.findUnique({
      where: { id: cost.projectId },
      select: { name: true, code: true },
    }));

  const amountStr = Number(cost.amount).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
  const projLabel = project ? `${project.code || ''} ${project.name || ''}`.trim() || 'Projeto' : 'Projeto';

  for (const uid of userIds) {
    if (excludeIds.has(uid)) continue;
    try {
      const u = await prisma.user.findUnique({ where: { id: uid }, select: { email: true, name: true } });
      await NotificationService.createNotification(prisma, {
        userId: uid,
        title: 'Custo de projeto pendente (alçada)',
        message: `Um custo de ${amountStr} no projeto "${projLabel}" foi submetido e se enquadra na sua alçada de aprovação.`,
        type: 'INFO',
        link: '/approvals?tab=projectCost',
        eventCode: 'APPROVAL_TIER_PROJECT_COST',
        entityType: 'ProjectCost',
        entityId: cost.id,
        dedupeKey: `tier-pc-${cost.id}-${uid}`,
        category: 'APPROVALS',
        mail: u?.email
          ? {
              to: u.email,
              subject: '[Aprovação] Custo de projeto',
              html: EmailTemplateService.getSimpleAlertEmail(
                u.name,
                'Custo de projeto na sua alçada',
                `<p>Custo de <strong>${amountStr}</strong> no projeto <strong>${projLabel}</strong> requer a sua aprovação.</p>`,
                '/approvals?tab=projectCost'
              ),
              type: 'APPROVAL_TIER_PROJECT_COST',
              module: 'APPROVALS'
            }
          : null
      });
    } catch (e) {
      logger.error(`[ApprovalTier] Notificação custo projeto falhou para usuário ${uid}:`, e.message);
    }
  }
}

class ApprovalTierService {
  static ENTITY_TYPES = ENTITY_TYPES;

  static async list(prisma) {
    try {
      return await prisma.approvalTier.findMany({
        orderBy: [{ entityType: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
        include: { role: { select: { id: true, name: true } } },
      });
    } catch (e) {
      // P2021 = tabela não existe (migration não aplicada neste schema / tenant)
      const missing =
        e?.code === 'P2021' ||
        (typeof e?.message === 'string' &&
          (/does not exist/i.test(e.message) || /relation.*approval/i.test(e.message)));
      if (missing) {
        const logger = require('../config/logger');
        logger.warn(
          '[ApprovalTier] Tabela indisponível neste schema — retornando []. Aplique migrations (ex.: prisma migrate deploy ou migrate-all-tenants).',
          e.message
        );
        return [];
      }
      throw e;
    }
  }

  static async getById(prisma, id) {
    return prisma.approvalTier.findUnique({
      where: { id },
      include: { role: { select: { id: true, name: true } } },
    });
  }

  static async create(prisma, data) {
    const role = await prisma.role.findUnique({ where: { id: data.roleId } });
    if (!role) {
      const err = new Error('Perfil não encontrado');
      err.statusCode = 400;
      throw err;
    }
    if (!Object.values(ENTITY_TYPES).includes(data.entityType)) {
      const err = new Error('Tipo de entidade inválido');
      err.statusCode = 400;
      throw err;
    }
    return prisma.approvalTier.create({
      data: {
        name: data.name,
        entityType: data.entityType,
        roleId: data.roleId,
        minAmount: data.minAmount ?? null,
        maxAmount: data.maxAmount ?? null,
        globalScope: Boolean(data.globalScope),
        isActive: data.isActive !== false,
        sortOrder: data.sortOrder ?? 0,
      },
      include: { role: { select: { id: true, name: true } } },
    });
  }

  static async update(prisma, id, data) {
    const existing = await prisma.approvalTier.findUnique({ where: { id } });
    if (!existing) {
      const err = new Error('Alçada não encontrada');
      err.statusCode = 404;
      throw err;
    }
    if (data.roleId) {
      const role = await prisma.role.findUnique({ where: { id: data.roleId } });
      if (!role) {
        const err = new Error('Perfil não encontrado');
        err.statusCode = 400;
        throw err;
      }
    }
    if (data.entityType && !Object.values(ENTITY_TYPES).includes(data.entityType)) {
      const err = new Error('Tipo de entidade inválido');
      err.statusCode = 400;
      throw err;
    }

    return prisma.approvalTier.update({
      where: { id },
      data: {
        ...(data.name != null && { name: data.name }),
        ...(data.entityType != null && { entityType: data.entityType }),
        ...(data.roleId != null && { roleId: data.roleId }),
        ...(data.minAmount !== undefined && { minAmount: data.minAmount }),
        ...(data.maxAmount !== undefined && { maxAmount: data.maxAmount }),
        ...(data.globalScope !== undefined && { globalScope: Boolean(data.globalScope) }),
        ...(data.isActive !== undefined && { isActive: Boolean(data.isActive) }),
        ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
      },
      include: { role: { select: { id: true, name: true } } },
    });
  }

  static async remove(prisma, id) {
    await prisma.approvalTier.delete({ where: { id } });
  }
}

module.exports = {
  ApprovalTierService,
  ENTITY_TYPES,
  buildExpensePendingWhere,
  buildProjectCostPendingWhere,
  buildProjectBaselinePendingWhere,
  buildMeetingMinutePendingWhere,
  buildProposalPendingWhere,
  userCanApproveExpense,
  userCanApproveProjectCost,
  userCanApproveProjectBaseline,
  userCanApproveMeetingMinute,
  userCanApproveProposal,
  userCanApproveBudget,
  filterBudgetsPendingForUser,
  amountInTierRange,
  tierMatchesEntityAmount,
  isSuperAdminUser,
  budgetTotalAmount,
  notifyExpenseTierApprovers,
  notifyProjectCostTierApprovers,
  notifyProjectBaselineTierApprovers,
  notifyMeetingMinuteTierApprovers,
  notifyProposalTierApprovers,
  notifyBudgetTierApprovers,
};
