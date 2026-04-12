const ChangeRequestRepository = require('../repositories/change-request.repository');
const NotificationService = require('./notification.service');
const AuditLogRepository = require('../repositories/audit-log.repository');
const UserRepository = require('../repositories/user.repository');
const EmailTemplateService = require('./email-template.service');
const FreezeWindowService = require('./freeze-window.service'); // Governance
const { getUserAccessScope, getAccessibleUserIds } = require('../utils/access-scope');
const logger = require('../config/logger');
const { CAB_MEMBER_ROLE_NAME } = require('../config/governance.config');

class ChangeRequestService {
  static calculateRisk(assessment) {
    if (!assessment || typeof assessment !== 'object') return 'MEDIO'; // Fallback

    let score = 0;
    // Perguntas baseadas no plano
    if (assessment.affectsProduction) score += 5;
    if (assessment.hasDowntime) score += 10;
    if (assessment.tested === false) score += 5; // Se NÃO testado, aumenta risco
    if (assessment.easyRollback === false) score += 5; // Se NÃO tem rollback fácil

    if (score <= 5) return 'BAIXO';
    if (score <= 10) return 'MEDIO';
    if (score <= 15) return 'ALTO';
    return 'CRITICO';
  }

  static async create(prisma, userId, data) {
    const start = new Date(data.scheduledStart);
    const end = new Date(data.scheduledEnd);

    if (end <= start) throw { statusCode: 400, message: 'Data fim deve ser maior que início.' };

    // --- GOVERNANCE: Freeze Window Check ---
    if (data.type !== 'EMERGENCIAL') {
      const freeze = await FreezeWindowService.checkFreeze(prisma, start, end);
      if (freeze) {
        throw { statusCode: 400, message: `Conflito com Janela de Congelamento: ${freeze.name} (${freeze.description})` };
      }
    }

    // --- GOVERNANCE: Conflict Detection (Warning Only - implemented via frontend check or soft warning in response) ---
    // For backend strictness, we just allow creation. The frontend should warn before calling create.
    // However, if we wanted to block, we would do it here.
    // Let's implement a 'warning' mechanism if possible, but create doesn't return warnings easily without changing structure.
    // We will assume frontend checks conflict before submitting.

    // Auto-generate GMUD code if not provided
    if (!data.code) {
      const year = new Date().getFullYear();
      const lastCode = await ChangeRequestRepository.findLastCode(prisma);
      if (lastCode) {
        const match = lastCode.match(/GMUD-(\d{4})-(\d+)/);
        if (match) {
          const lastYear = parseInt(match[1], 10);
          const lastSeq = parseInt(match[2], 10);
          const nextSeq = lastYear === year ? lastSeq + 1 : 1;
          data.code = `GMUD-${year}-${String(nextSeq).padStart(4, '0')}`;
        } else {
          data.code = `GMUD-${year}-0001`;
        }
      } else {
        data.code = `GMUD-${year}-0001`;
      }
    } else {
      // Only check for duplicates if user provided a manual code
      const existing = await ChangeRequestRepository.findByCode(prisma, data.code);
      if (existing) throw { statusCode: 409, message: 'Código de GMUD já existe.' };
    }

    let status = 'DRAFT';
    let riskLevel = data.riskLevel || 'MEDIO';

    // 1. Cálculo de Risco Dinâmico
    if (data.riskAssessment) {
      riskLevel = this.calculateRisk(data.riskAssessment);
    }

    // 2. Recuperar Gestor do Centro de Custo do Solicitante (Auto-Assign)
    const { assetIds, approvers: approverIds, ...restData } = data;
    if (assetIds && assetIds.length > 0) {
      const scope = await getUserAccessScope(prisma, userId);
      if (scope.isAdmin === false) {
        const allowedCostCenters = scope.isManager
          ? scope.accessibleCostCenterIds
          : (scope.userCostCenterId ? [scope.userCostCenterId] : []);
        const assets = await prisma.asset.findMany({
          where: { id: { in: assetIds } },
          select: { costCenterId: true }
        });
        const invalid = assets.some(asset => !asset.costCenterId || !allowedCostCenters.includes(asset.costCenterId));
        if (invalid) {
          throw { statusCode: 403, message: 'Acesso negado.' };
        }
      }
    } // Restore destructuring
    const requester = await prisma.user.findUnique({
      where: { id: userId },
      include: { costCenter: true }
    });

    let autoApprovers = [];
    if (requester?.costCenter?.managerId) {
      // Se o solicitante for o próprio gestor, talvez buscar o diretor? (Regra futura). 
      // Por enquanto, se ele for o gestor, ele se aprova ou bloqueia?
      // Regra padrão: Gestor aprova. Se requester == manager, ele pode aprovar a própria (auto-aprovação) ou precisa do superior.
      // Vamos assumir que o sistema permite, ou o admin define.
      // REGRA SIMPLES: Atribui o managerId.
      autoApprovers.push({
        userId: requester.costCenter.managerId,
        role: 'MANAGER',
        status: 'PENDING'
      });
    }

    // --- GOVERNANCE: CAB Auto-Assignment (perfil parametrizável; não usa ApprovalTier) ---
    if (riskLevel === 'CRITICO') {
      const cabMembers = await prisma.user.findMany({
        where: { roles: { some: { name: CAB_MEMBER_ROLE_NAME } } },
      });

      cabMembers.forEach(member => {
        // Avoid duplicates if manager is also CAB (unlikely but possible)
        if (!autoApprovers.find(a => a.userId === member.id)) {
          autoApprovers.push({
            userId: member.id,
            role: 'CAB_MEMBER',
            status: 'PENDING'
          });
        }
      });
    }

    // Force DRAFT initially for this workflow
    status = 'DRAFT';

    const changeRequest = await ChangeRequestRepository.create(prisma, {
      ...restData,
      riskLevel,
      status, // Sempre DRAFT
      scheduledStart: start,
      scheduledEnd: end,
      requesterId: userId,
      assets: assetIds && assetIds.length > 0 ? { connect: assetIds.map(id => ({ id })) } : undefined,
      approvers: autoApprovers.length > 0 ? {
        create: autoApprovers
      } : undefined
    });

    // Send notifications for initial approvers
    // Notifications moved to Submit (Update) or if created directly as PENDING (not case here)
    // if (status === 'PENDING_APPROVAL') { ... }



    // Log Activity
    await AuditLogRepository.create(prisma, {
      userId,
      action: 'criou GMUD',
      module: 'GMUD',
      entityId: changeRequest.id,
      entityType: 'CHANGE_REQUEST',
      newData: changeRequest
    });

    return changeRequest;
  }

  static async getAll(prisma, filters, userId) {
    const scope = userId ? await getUserAccessScope(prisma, userId) : null;
    const accessibleUserIds = scope ? await getAccessibleUserIds(prisma, userId, scope) : null;
    return ChangeRequestRepository.findAll(prisma, filters, userId, scope, accessibleUserIds);
  }

  static async getById(prisma, id, userId) {
    const gmud = await ChangeRequestRepository.findById(prisma, id);
    if (!gmud) throw { statusCode: 404, message: 'GMUD nao encontrada.' };
    await this.assertAccess(prisma, gmud, userId);
    return gmud;
  }

  static async update(prisma, id, user, data) {
    const gmud = await this.getById(prisma, id, user.userId);
    const userId = user.userId;

    // Fetch full user to get role names (JWT only has IDs)
    const fullUser = await UserRepository.findById(prisma, userId);
    const isSuperAdmin = fullUser && fullUser.roles.some(r => ['Super Admin', 'Company Admin'].includes(r.name));

    // TRAVA DE SEGURANÇA: Apenas o dono ou Admin/Manager pode editar
    if (gmud.requesterId !== userId && !isSuperAdmin) {
      throw { statusCode: 403, message: 'Você não tem permissão para editar esta GMUD.' };
    }

    // Regra de Negócio: Não editar se já estiver aprovada/finalizada
    // EXCEÇÃO: Permitir edição para registrar execução (status APPROVED -> EXECUTED/FAILED)
    if (['EXECUTED', 'CANCELLED', 'FAILED'].includes(gmud.status)) {
      throw { statusCode: 400, message: 'Não é possível editar uma GMUD finalizada.' };
    }

    // Se está aprovada, só pode atualizar status, notas de fechamento e campos de execução real
    if (gmud.status === 'APPROVED' || gmud.status === 'APPROVED_WAITING_EXECUTION') {
      const allowed = ['status', 'closureNotes', 'actualStart', 'actualEnd', 'rootCause', 'lessonsLearned', 'preventiveActions'];
      const keys = Object.keys(data);
      const hasInvalidKey = keys.some(k => !allowed.includes(k));

      // Verifica se é uma transição de execução válida
      if (hasInvalidKey) {
        throw { statusCode: 400, message: 'GMUD Aprovada só permite registro de execução (status, notas, datas reais e PIR).' };
      }
    }

    // Parse actual dates if provided
    if (data.actualStart) data.actualStart = new Date(data.actualStart);
    if (data.actualEnd) data.actualEnd = new Date(data.actualEnd);

    if (data.scheduledStart) data.scheduledStart = new Date(data.scheduledStart);
    if (data.scheduledEnd) data.scheduledEnd = new Date(data.scheduledEnd);

    // Atualiza Risco se o questionário mudou
    if (data.riskAssessment) {
      data.riskLevel = this.calculateRisk(data.riskAssessment);
    }

    // --- GOVERNANCE: Freeze Window Check on Update ---
    if (data.scheduledStart || data.scheduledEnd) {
      const start = data.scheduledStart ? new Date(data.scheduledStart) : new Date(gmud.scheduledStart);
      const end = data.scheduledEnd ? new Date(data.scheduledEnd) : new Date(gmud.scheduledEnd);

      if (gmud.type !== 'EMERGENCIAL') {
        const freeze = await FreezeWindowService.checkFreeze(prisma, start, end);
        if (freeze) throw { statusCode: 400, message: `Conflito com Janela de Congelamento: ${freeze.name}` };
      }
    }

    // --- GOVERNANCE: PIR Enforcement ---
    if (['FAILED', 'CANCELLED'].includes(data.status)) {
      // Check if previous status was APPROVED or EXECUTED (meaning it ran and failed)
      // If just cancelling a Draft, no PIR needed.
      const wasRunning = ['APPROVED', 'APPROVED_WAITING_EXECUTION', 'EXECUTED'].includes(gmud.status);

      if (wasRunning) {
        if (!data.rootCause || !data.lessonsLearned) {
          throw { statusCode: 400, message: 'Para finalizar como Falha/Cancelado, é obrigatório preencher o PIR (Causa Raiz e Lições Aprendidas).' };
        }
      }
    }

    const updatedGmud = await ChangeRequestRepository.update(prisma, id, data);

    // NOTIFICATION LOGIC: DRAFT -> PENDING_APPROVAL
    if (gmud.status === 'DRAFT' && data.status === 'PENDING_APPROVAL') {
      // Fetch full GMUD with approvers
      const fullGmud = await prisma.changeRequest.findUnique({
        where: { id },
        include: { approvers: { include: { user: true } } }
      });

      if (fullGmud && fullGmud.approvers) {
        for (const approver of fullGmud.approvers) {
          const user = approver.user;
          if (!user) continue;

          await NotificationService.createNotification(prisma, {
            userId: user.id,
            title: 'Nova Aprovação Pendente',
            message: `Você foi designado como aprovador da GMUD ${fullGmud.code}: ${fullGmud.title}`,
            type: 'WARNING',
            link: `/changes?id=${fullGmud.id}`,
            eventCode: 'GMUD_PENDING_APPROVAL',
            entityType: 'ChangeRequest',
            entityId: fullGmud.id,
            category: 'GMUD',
            mail: user.email
              ? {
                  to: user.email,
                  subject: `[Ação Necessária] Aprovação GMUD: ${fullGmud.code}`,
                  html: EmailTemplateService.getGmudApprovalTemplate(user.name, fullGmud),
                  type: 'CHANGE_REQUEST_APPROVAL_NEEDED',
                  module: 'GMUD'
                }
              : null
          });
        }
      }
    }

    await AuditLogRepository.create(prisma, {
      userId,
      action: 'atualizou GMUD',
      module: 'GMUD',
      entityId: id,
      entityType: 'CHANGE_REQUEST',
      newData: data
    });



    // Notificar Finalização
    if (['EXECUTED', 'FAILED', 'CANCELLED'].includes(data.status)) {
      try {
        // Re-fetch to get assets info if needed, or assume we need to query
        const fullGmud = await prisma.changeRequest.findUnique({
          where: { id },
          include: { assets: { include: { costCenter: { include: { department: true } } } } }
        });

        if (fullGmud && fullGmud.assets.length > 0) {
          // Notificar todos os gestores possíveis (deduplicar)
          const managers = new Set();
          fullGmud.assets.forEach(asset => {
            if (asset.costCenter?.department?.managerId) {
              managers.add(asset.costCenter.department.managerId);
            }
          });

          for (const managerId of managers) {
            await NotificationService.createNotification(prisma, {
              userId: managerId,
              title: `GMUD Finalizada: ${data.status}`,
              message: `A GMUD ${fullGmud.code} foi finalizada com status: ${data.status}.`,
              type: data.status === 'FAILED' ? 'ERROR' : 'INFO',
              link: `/changes?id=${fullGmud.id}`,
              eventCode: 'GMUD_FINISHED',
              entityType: 'ChangeRequest',
              entityId: fullGmud.id,
              category: 'GMUD'
            });
          }
        }
      } catch (e) {
        logger.error('Falha ao notificar Gestor de Centro de Custo na Finalização', e);
      }
    }

    return updatedGmud;
  }

  static async delete(prisma, id, user) {
    const gmud = await this.getById(prisma, id, user.userId);
    const userId = user.userId;

    // Fetch full user to get role names (JWT only has IDs)
    const fullUser = await UserRepository.findById(prisma, userId);
    const isSuperAdmin = fullUser && fullUser.roles.some(r => ['Super Admin', 'Company Admin'].includes(r.name));

    // TRAVA DE SEGURANÇA
    if (gmud.requesterId !== userId && !isSuperAdmin) {
      throw { statusCode: 403, message: 'Você não tem permissão para excluir esta GMUD.' };
    }

    if (gmud.status !== 'DRAFT') {
      throw { statusCode: 400, message: 'Apenas rascunhos podem ser excluídos.' };
    }

    return ChangeRequestRepository.delete(prisma, id);
  }

  static async addApprover(prisma, changeRequestId, approverId, role = 'MANAGER', actorId) {
    const gmud = await this.getById(prisma, changeRequestId, actorId);

    // 1. Verificar se já existe
    const existing = await ChangeRequestRepository.findApprover(prisma, changeRequestId, approverId);
    if (existing) {
      return existing;
    }

    try {
      const newApprover = await ChangeRequestRepository.addApprover(prisma, {
        changeRequestId,
        userId: approverId,
        role: role || 'MANAGER'
      });

      // 2. Notificações (System + Email)
      const user = await prisma.user.findUnique({ where: { id: approverId } });

      if (user) {
        await NotificationService.createNotification(prisma, {
          userId: user.id,
          title: 'Nova Aprovação Pendente',
          message: `Você foi adicionado como aprovador da GMUD ${gmud.code}: ${gmud.title}`,
          type: 'WARNING',
          link: `/changes?id=${changeRequestId}`,
          eventCode: 'GMUD_APPROVER_ADDED',
          entityType: 'ChangeRequest',
          entityId: changeRequestId,
          category: 'GMUD',
          mail: user.email
            ? {
                to: user.email,
                subject: `[Ação Necessária] Aprovação GMUD: ${gmud.code}`,
                html: EmailTemplateService.getGmudApprovalTemplate(user.name, gmud),
                type: 'CHANGE_REQUEST_APPROVAL_NEEDED',
                module: 'GMUD'
              }
            : null
        });
      }

      return newApprover;

    } catch (error) {
      if (error.code === 'P2003') { // FK Violation
        throw { statusCode: 400, message: 'Usuário inválido para aprovação.' };
      }
      throw error;
    }
  }

  static async reviewChange(prisma, id, userId, { status, comment }) {
    await this.getById(prisma, id, userId);
    const approval = await ChangeRequestRepository.findApprover(prisma, id, userId);

    if (!approval) throw { statusCode: 403, message: 'Você não é um aprovador desta GMUD.' };
    if (approval.status !== 'PENDING') throw { statusCode: 400, message: 'Você já avaliou esta GMUD.' };

    await ChangeRequestRepository.updateApproval(prisma, approval.id, status, comment);

    if (status === 'REJECTED') {
      await ChangeRequestRepository.update(prisma, id, { status: 'REJECTED' });

      // Notificar Requester
      const gmud = await this.getById(prisma, id, userId);
      await NotificationService.createNotification(prisma, {
        userId: gmud.requesterId,
        title: 'GMUD Rejeitada',
        message: `Sua GMUD ${gmud.code} foi rejeitada pelo aprovador.`,
        type: 'ERROR',
        link: `/changes?id=${id}`,
        eventCode: 'GMUD_REJECTED',
        entityType: 'ChangeRequest',
        entityId: id,
        category: 'GMUD'
      });
    }
    // NOVO: Workflow de Revisão/Rework
    else if (status === 'REVISION_REQUESTED') {
      await ChangeRequestRepository.update(prisma, id, { status: 'REVISION_REQUESTED' });

      // Resetar status do aprovador para PENDING para poder aprovar depois
      await ChangeRequestRepository.updateApproval(prisma, approval.id, 'PENDING', comment);

      // Notificar Requester para corrigir
      const gmud = await this.getById(prisma, id, userId);
      await NotificationService.createNotification(prisma, {
        userId: gmud.requesterId,
        title: '📝 Revisão Solicitada',
        message: `Sua GMUD ${gmud.code} requer ajustes. Motivo: ${comment || 'Veja os detalhes na GMUD.'}`,
        type: 'WARNING',
        link: `/changes?id=${id}`,
        eventCode: 'GMUD_REVISION',
        entityType: 'ChangeRequest',
        entityId: id,
        category: 'GMUD'
      });
    }
    else if (status === 'APPROVED') {
      const allApproved = await ChangeRequestRepository.checkAllApproved(prisma, id);
      if (allApproved) {
        await ChangeRequestRepository.update(prisma, id, { status: 'APPROVED_WAITING_EXECUTION' });

        // Notificar Requester
        const gmud = await this.getById(prisma, id, userId);
        await NotificationService.createNotification(prisma, {
          userId: gmud.requesterId,
          title: 'GMUD Aprovada',
          message: `Sua GMUD ${gmud.code} foi aprovada por todos e está pronta para execução.`,
          type: 'INFO',
          link: `/changes?id=${id}`,
          eventCode: 'GMUD_APPROVED',
          entityType: 'ChangeRequest',
          entityId: id,
          category: 'GMUD'
        });
      }
    }

    await AuditLogRepository.create(prisma, {
      userId,
      action: `avaliou GMUD: ${status}`,
      module: 'GMUD',
      entityId: id,
      entityType: 'CHANGE_REQUEST',
      newData: { status, comment }
    });

    return { message: 'Avaliação registrada.' };
  }
  static async assertAccess(prisma, gmud, userId) {
    if (!userId || !gmud) return;
    const scope = await getUserAccessScope(prisma, userId);
    if (scope.isAdmin) return;

    const accessibleUserIds = await getAccessibleUserIds(prisma, userId, scope);
    const isRequester = accessibleUserIds && accessibleUserIds.includes(gmud.requesterId);
    const isApprover = gmud.approvers && gmud.approvers.some(a => a.userId === userId);
    const hasAssetAccess = scope.isManager
      && gmud.assets
      && gmud.assets.some(asset => asset.costCenterId && scope.accessibleCostCenterIds.includes(asset.costCenterId));

    if (!isRequester && !isApprover && !hasAssetAccess) {
      throw { statusCode: 403, message: 'Acesso negado.' };
    }
  }
} // ChangeRequestService

module.exports = ChangeRequestService;







