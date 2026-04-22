/**
 * GMUD com status final EXECUTED — dados de teste/validação para backoffice GMUD-02
 * (pós-conclusão: leitura + regras de negócio de edição).
 *
 * Idempotente: upsert por `code` estável.
 * Depende do seed «3 áreas» (utilizador gestor OPS, projeto, ativo).
 *
 * Código: E2E-GMUD-GMUD02-EXEC-001
 *
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {{ verbose?: boolean }} [options]
 * @returns {Promise<{ code: string, id: string, status: string }|{ skipped: true, reason: string }>}
 */

const GMUD_GMUD02_EXEC_CODE = 'E2E-GMUD-GMUD02-EXEC-001';

/** Deve alinhar com `AREAS` em seed-three-areas-workflow (área OPS). */
const OPS_REF = {
  mgrEmail: 'e2e-seed-ops-mgr@g360.com.br',
  projectCode: 'E2E-PRJ-OPS',
  assetCode: 'E2E-AST-OPS',
};

const BASE_TITLE = 'GMUD seed GMUD-02 — execução concluída (E2E)';

async function seedGmudFinalizedGmud02(prisma, options = {}) {
  const { verbose = false } = options;
  const log = (...a) => {
    if (verbose) console.log(...a);
  };

  const user = await prisma.user.findFirst({ where: { email: OPS_REF.mgrEmail } });
  if (!user) {
    log('   ⚠️  seed GmudFinalizedGmud02: gestor OPS não encontrado. Execute o seed 3 áreas antes.');
    return { skipped: true, reason: 'no_ops_user' };
  }

  const project = await prisma.project.findFirst({ where: { code: OPS_REF.projectCode } });
  const asset = await prisma.asset.findFirst({ where: { code: OPS_REF.assetCode } });

  const now = new Date();
  const day = 24 * 60 * 60 * 1000;
  const schedStart = new Date(now.getTime() - 14 * day);
  const schedEnd = new Date(now.getTime() - 13 * day);
  const actualStart = new Date(now.getTime() - 13 * day + 30 * 60 * 1000);
  const actualEnd = new Date(now.getTime() - 13 * day + 2 * 60 * 60 * 1000);

  const core = {
    requesterId: user.id,
    code: GMUD_GMUD02_EXEC_CODE,
    title: BASE_TITLE,
    description:
      'Mudança de referência com status EXECUTED (finalizada com sucesso) para testes de visão, auditoria e bloqueio pós-conclusão.',
    justification: 'Dados de seed idempotente para validação de GMUD-02 e regressões de GMUD.',
    type: 'NORMAL',
    riskLevel: 'BAIXO',
    impact: 'MENOR',
    status: 'EXECUTED',
    scheduledStart: schedStart,
    scheduledEnd: schedEnd,
    actualStart,
    actualEnd,
    backoutPlan: 'Rollback: restaurar release anterior; smoke test em 15 minutos. (seed E2E)',
    closureNotes:
      'Execução concluída sem incidentes reportados. Evidências e logs no repositório operacional. Seed G360 GMUD-02.',
    projectId: project?.id ?? null,
    riskAssessment: { affectsProduction: true, hasDowntime: false, tested: true, easyRollback: true },
  };

  let row = await prisma.changeRequest.findFirst({ where: { code: GMUD_GMUD02_EXEC_CODE } });

  if (row) {
    await prisma.changeApprover.deleteMany({ where: { changeRequestId: row.id } });
    await prisma.changeRequest.update({
      where: { id: row.id },
      data: {
        ...core,
        assets: { set: asset ? [{ id: asset.id }] : [] },
      },
    });
    await prisma.changeApprover.create({
      data: {
        changeRequestId: row.id,
        userId: user.id,
        role: 'CAB',
        status: 'APPROVED',
      },
    });
    log(`   ✓ GMUD ${GMUD_GMUD02_EXEC_CODE} atualizada (EXECUTED).`);
  } else {
    row = await prisma.changeRequest.create({
      data: {
        ...core,
        approvers: {
          create: [{ userId: user.id, role: 'CAB', status: 'APPROVED' }],
        },
        ...(asset
          ? {
              assets: { connect: [{ id: asset.id }] },
            }
          : {}),
      },
    });
    log(`   ✓ GMUD ${GMUD_GMUD02_EXEC_CODE} criada (EXECUTED).`);
  }

  const fresh = await prisma.changeRequest.findFirst({
    where: { code: GMUD_GMUD02_EXEC_CODE },
    select: { id: true, code: true, status: true, title: true },
  });
  if (verbose && fresh) {
    log(`      id=${fresh.id}  title="${fresh.title}"`);
  }

  return { id: fresh.id, code: fresh.code, status: fresh.status };
}

module.exports = {
  seedGmudFinalizedGmud02,
  GMUD_GMUD02_EXEC_CODE,
  OPS_REF,
};
