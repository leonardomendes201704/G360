const ProjectRepository = require('../repositories/project.repository');
const AuditLogRepository = require('../repositories/audit-log.repository');
const NotificationService = require('./notification.service');
const EmailTemplateService = require('./email-template.service');
const { getUserAccessScope, getScopedCostCenterIds } = require('../utils/access-scope');
const logger = require('../config/logger');
const {
  userCanApproveProjectBaseline,
  notifyProjectBaselineTierApprovers,
} = require('./approval-tier.service');

class ProjectService {
  static async create(prisma, userId, data) {
    const { techLeadId, ...projectData } = data;

    // Ensure managerId is set (default to creator if not provided)
    if (!projectData.managerId) {
      projectData.managerId = userId;
    }

    // Auto-generate code if not provided
    if (!projectData.code) {
      const lastCode = await ProjectRepository.findLastProjectCode(prisma);
      if (lastCode) {
        // Extract number from PRJ-XXX
        const match = lastCode.match(/PRJ-(\d+)/);
        if (match) {
          const nextNum = parseInt(match[1], 10) + 1;
          projectData.code = `PRJ-${String(nextNum).padStart(3, '0')}`;
        } else {
          // Fallback if pattern doesn't match roughly
          projectData.code = 'PRJ-001';
        }
      } else {
        projectData.code = 'PRJ-001';
      }
    }

    const existing = await ProjectRepository.findByCode(prisma, projectData.code);
    if (existing) throw { statusCode: 409, message: `Código ${projectData.code} já existe.` };

    const parseDate = (val) => {
      if (!val) return undefined;
      const d = new Date(val);
      return isNaN(d.getTime()) ? undefined : d;
    };

    if (projectData.startDate) projectData.startDate = parseDate(projectData.startDate);
    if (projectData.endDate) projectData.endDate = parseDate(projectData.endDate);
    if (projectData.actualStartDate) projectData.actualStartDate = parseDate(projectData.actualStartDate);
    if (projectData.actualEndDate) projectData.actualEndDate = parseDate(projectData.actualEndDate);

    // Auto-assign Department from Creator if not provided
    let departmentId = projectData.departmentId;

    // Se costCenterId foi enviado, usamos o departamento dele
    if (!departmentId && projectData.costCenterId) {
      const cc = await prisma.costCenter.findUnique({ where: { id: projectData.costCenterId } });
      if (cc && cc.departmentId) departmentId = cc.departmentId;
    }

    if (!departmentId) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (user && user.departmentId) {
        departmentId = user.departmentId;
      }
    }

    if (projectData.costCenterId) {
      const scope = await getUserAccessScope(prisma, userId);
      if (scope.isAdmin === false) {
        const allowedCostCenters = getScopedCostCenterIds(scope);
        if (!allowedCostCenters || !allowedCostCenters.includes(projectData.costCenterId)) {
          throw { statusCode: 403, message: 'Acesso negado.' };
        }
      }
    }

    let project;
    try {
      project = await ProjectRepository.create(prisma, {
        ...projectData,
        departmentId,
        techLeadId, // [FIX] Include techLeadId
        creatorId: userId, // [NEW] Set Creator
      });
    } catch (error) {
      if (error.code === 'P2002') {
        throw { statusCode: 409, message: 'Já existe um projeto com este código.' };
      }
      throw error;
    }

    await AuditLogRepository.create(prisma, {
      userId,
      action: 'criou o projeto',
      module: 'PROJECTS',
      entityId: project.id,
      entityType: 'PROJECT',
      newData: project
    });

    if (techLeadId) {
      try {
        await ProjectRepository.addMember(prisma, {
          projectId: project.id,
          userId: techLeadId,
          role: 'TECH_LEAD'
        });
        await NotificationService.createNotification(prisma,
          techLeadId,
          'Novo Projeto Atribuído',
          `Você foi definido como Tech Lead do projeto ${project.name}`,
          'INFO',
          `/projects/${project.id}`
        );

        // Notify via Email
        const techLead = await prisma.user.findUnique({ where: { id: techLeadId } });
        if (techLead && techLead.email) {
          const MailService = require('./mail.service');
          await MailService.sendMail(prisma, {
            to: techLead.email,
            subject: `[PROJETO] Você é Tech Lead: ${project.name}`,
            html: EmailTemplateService.getProjectAssignmentTemplate(techLead.name, project.name, project.id, 'TECH_LEAD'),
            type: 'PROJECT_CREATED',
            module: 'PROJECTS'
          });
        }
      } catch (e) {
        logger.error('Falha ao notificar Tech Lead', e);
      }
    }

    if (projectData.managerId && projectData.managerId !== techLeadId) {
      try {
        await ProjectRepository.addMember(prisma, {
          projectId: project.id,
          userId: projectData.managerId,
          role: 'MANAGER'
        });
        await NotificationService.createNotification(prisma,
          projectData.managerId,
          'Novo Projeto Atribuído',
          `Você foi definido como Gerente do projeto ${project.name}`,
          'INFO',
          `/projects/${project.id}`
        );

        // Notify via Email
        const manager = await prisma.user.findUnique({ where: { id: projectData.managerId } });
        if (manager && manager.email) {
          const MailService = require('./mail.service');
          await MailService.sendMail(prisma, {
            to: manager.email,
            subject: `[PROJETO] Você é Gerente: ${project.name}`,
            html: EmailTemplateService.getProjectAssignmentTemplate(manager.name, project.name, project.id, 'MANAGER'),
            type: 'PROJECT_CREATED',
            module: 'PROJECTS'
          });
        }
      } catch (e) {
        logger.error('Falha ao notificar Manager', e);
      }
    }

    // [FIX] Ensure Creator is a Member if they are not Manager or Tech Lead
    // This prevents the creator from losing visibility of the project immediately after creation.
    if (userId !== projectData.managerId && userId !== techLeadId) {
      try {
        await ProjectRepository.addMember(prisma, {
          projectId: project.id,
          userId: userId,
          role: 'MEMBER' // or 'OBSERVER' depending on business rules, defaulting to MEMBER for visibility
        });
        logger.info(`[ProjectService] Creator ${userId} added as MEMBER to project ${project.id}`);
      } catch (e) {
        // Ignore if already added (unlikely handled by check above but safe to ignore)
        if (e.code !== 'P2002') logger.error('Failed to add creator as member', e);
      }
    }

    // [NEW] Notify Cost Center Manager that project needs approval
    if (projectData.costCenterId) {
      try {
        const costCenter = await prisma.costCenter.findUnique({
          where: { id: projectData.costCenterId },
          include: { manager: true }
        });

        if (costCenter?.managerId) {
          await NotificationService.createNotification(prisma,
            costCenter.managerId,
            'Aprovação Necessária',
            `O projeto ${project.name} foi criado e aguarda sua aprovação.`,
            'WARNING',
            `/approvals`
          );

          // Email notification
          if (costCenter.manager?.email) {
            const MailService = require('./mail.service');
            await MailService.sendMail(prisma, {
              to: costCenter.manager.email,
              subject: `[APROVAÇÃO] Novo Projeto Pendente: ${project.name}`,
              html: `<p>Olá ${costCenter.manager.name},</p><p>O projeto <b>${project.name}</b> (${project.code}) foi criado e aguarda sua aprovação.</p><p>Acesse o sistema para analisar.</p>`,
              type: 'PROJECT_APPROVAL_REQUEST',
              module: 'PROJECTS'
            });
          }
        }
      } catch (e) {
        logger.error('Falha ao notificar gestor do CC', e);
      }
    }

    return project;
  }



  // Helper para sincronizar roles de membros
  static async ensureMemberRole(prisma, projectId, targetUserId, role, adminId) {
    const member = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: targetUserId } }
    });

    if (member) {
      if (member.role !== role) {
        // Se já existe e role é diferente, atualiza
        await this.updateMember(prisma, projectId, targetUserId, role, adminId);
      }
    } else {
      // Se não existe, adiciona
      await this.addMember(prisma, projectId, { userId: targetUserId, role }, adminId);
    }
  }

  static async update(prisma, id, userId, data) {
    logger.info('[ProjectService.update] Received data:', { id, status: data.status, priority: data.priority });
    const project = await this.getById(prisma, id, userId);

    // Capture old values for comparison
    const oldTechLeadId = project.techLeadId;
    const oldManagerId = project.managerId;

    const updated = await ProjectRepository.update(prisma, id, data);
    logger.info('[ProjectService.update] Updated project:', { id, status: updated.status, priority: updated.priority });

    await AuditLogRepository.create(prisma, {
      userId,
      action: 'atualizou projeto',
      module: 'PROJECTS',
      entityId: id,
      entityType: 'PROJECT',
      oldData: project,
      newData: updated
    });

    // --- SYNC MEMBER ROLES ---
    // Ensure data consistency between Project fields (techLeadId, managerId) and ProjectMember roles

    const newTechLeadId = data.techLeadId !== undefined ? data.techLeadId : oldTechLeadId;
    const newManagerId = data.managerId !== undefined ? data.managerId : oldManagerId;

    // 1. Handle Old Tech Lead -> Remove if lost role
    if (oldTechLeadId && oldTechLeadId !== newTechLeadId) {
      // If the old Tech Lead is becoming the Manager (or was already), set/keep as MANAGER
      if (oldTechLeadId === newManagerId) {
        await this.ensureMemberRole(prisma, id, oldTechLeadId, 'MANAGER', userId);
      } else {
        // Otherwise REMOVE from members (User expectation: lose access)
        await this.removeMember(prisma, id, oldTechLeadId, userId);
      }
    }

    // 2. Handle Old Manager -> Remove if lost role
    // Only process if distinct from Old Tech Lead (to avoid double processing if they were the same person)
    if (oldManagerId && oldManagerId !== newManagerId && oldManagerId !== oldTechLeadId) {
      // If Old Manager becomes Tech Lead, it will be handled in step 3. 
      // If NOT becoming Tech Lead, REMOVE.
      if (oldManagerId !== newTechLeadId) {
        await this.removeMember(prisma, id, oldManagerId, userId);
      }
    }

    // 3. Handle New Tech Lead -> Upgrade/Add
    if (newTechLeadId && newTechLeadId !== oldTechLeadId) {
      await this.ensureMemberRole(prisma, id, newTechLeadId, 'TECH_LEAD', userId);

      // Notify New Tech Lead
      try {
        await NotificationService.createNotification(prisma,
          newTechLeadId,
          'Atribuição de Projeto',
          `Você foi definido como Tech Lead do projeto ${updated.name}`,
          'INFO',
          `/projects/${updated.id}`
        );
        // Email would go here (omitted to keep sync simple, relies on addMember if new, but if updateMember no email currently)
      } catch (e) { logger.error('Error notifying new tech lead', e); }
    }

    // 4. Handle New Manager -> Upgrade/Add
    if (newManagerId && newManagerId !== oldManagerId && newManagerId !== newTechLeadId) {
      // Note: If newManager === newTechLead, the block above (Step 3) sets them as TECH_LEAD. 
      // We prioritize TECH_LEAD role or keep them distinct? 
      // In 'create', we prioritize TECH_LEAD. Here we skip if they are same.

      await this.ensureMemberRole(prisma, id, newManagerId, 'MANAGER', userId);

      // Notify New Manager
      try {
        await NotificationService.createNotification(prisma,
          newManagerId,
          'Atribuição de Projeto',
          `Você foi definido como Gerente do projeto ${updated.name}`,
          'INFO',
          `/projects/${updated.id}`
        );
      } catch (e) { logger.error('Error notifying new manager', e); }
    }

    return updated;
  }

  static async getAll(prisma, filters, user) {
    const userId = user?.userId || user?.id;
    const scope = userId ? await getUserAccessScope(prisma, userId) : null;
    return ProjectRepository.findAll(prisma, filters, userId, scope);
  }

  static async getById(prisma, id, userId) {
    const project = await ProjectRepository.findById(prisma, id);
    if (!project) throw { statusCode: 404, message: 'Projeto nao encontrado.' };

    if (userId) {
      const scope = await getUserAccessScope(prisma, userId);
      if (scope.isAdmin === false) {
        const isMember = project.members?.some(member => member.userId === userId);
        const isOwner = project.managerId === userId || project.techLeadId === userId || project.creatorId === userId;
        const hasCostCenterAccess = scope.isManager
          && project.costCenterId
          && scope.accessibleCostCenterIds.includes(project.costCenterId);

        if (!isMember && !isOwner && !hasCostCenterAccess) {
          throw { statusCode: 403, message: 'Acesso negado.' };
        }
      }
    }

    return project;
  }

  static async delete(prisma, id, userId) {
    await this.getById(prisma, id, userId);
    return ProjectRepository.delete(prisma, id);
  }

  static async addMember(prisma, projectId, { userId, role }, adminId) {
    await this.getById(prisma, projectId, adminId);
    try {
      const member = await ProjectRepository.addMember(prisma, { projectId, userId, role });

      if (adminId) {
        await AuditLogRepository.create(prisma, {
          userId: adminId,
          action: 'adicionou um membro',
          module: 'PROJECTS',
          entityId: projectId,
          entityType: 'PROJECT',
          newData: { addedUserId: userId, role }
        });
      }

      await NotificationService.createNotification(prisma,
        userId, // Member being added
        'Adicionado ao Projeto',
        `Você foi adicionado ao projeto com a função ${role}`, // Can't easily get project name here without extra query if not passed, assuming project ID in link is enough or generic message
        'INFO',
        `/projects/${projectId}`
      );

      return member;
    } catch (error) {
      if (error.code === 'P2002') throw { statusCode: 409, message: 'Usuário já é membro.' };
      throw error;
    }
  }

  static async updateMember(prisma, projectId, userId, role, adminId) {
    await this.getById(prisma, projectId, adminId);
    const member = await ProjectRepository.updateMemberRole(prisma, projectId, userId, role);

    if (adminId) {
      await AuditLogRepository.create(prisma, {
        userId: adminId,
        action: `alterou função de membro para ${role}`,
        module: 'PROJECTS',
        entityId: projectId,
        entityType: 'PROJECT',
        newData: { updatedUserId: userId, role }
      });
    }
    return member;
  }

  static async removeMember(prisma, projectId, userId, adminId) {
    await this.getById(prisma, projectId, adminId);
    await ProjectRepository.removeMember(prisma, projectId, userId);

    await AuditLogRepository.create(prisma, {
      userId: adminId,
      action: 'removeu membro do projeto',
      module: 'PROJECTS',
      entityId: projectId,
      entityType: 'PROJECT_MEMBER',
      oldData: { userId }
    });
  }

  // --- WORKFLOW DE APROVAÇÃO ---

  static async submitForApproval(prisma, projectId, userId) {
    await this.getById(prisma, projectId, userId);
    // Busca projeto para identificar o gestor que deve aprovar e não permitir submissão sem CC
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { costCenter: { include: { manager: true } } }
    });

    if (!project) throw { statusCode: 404, message: 'Projeto não encontrado' };

    if (project.approvalStatus !== 'DRAFT') {
      throw { statusCode: 400, message: 'Apenas projetos em rascunho podem ser submetidos para aprovação' };
    }

    if (!project.costCenter || !project.costCenter.managerId) {
      // Fallack: Se não tiver CC ou Manager, talvez permitir envio para ADMIN?
      // Por segurança, vamos exigir CC.
      throw { statusCode: 400, message: 'O projeto precisa de um Centro de Custo com Gerente definido para aprovação.' };
    }

    const updated = await ProjectRepository.update(prisma, projectId, {
      approvalStatus: 'PENDING_APPROVAL'
    });

    await AuditLogRepository.create(prisma, {
      userId,
      action: 'submeteu projeto para aprovação',
      module: 'PROJECTS',
      entityId: projectId,
      entityType: 'PROJECT'
    });

    // Notificar o Gerente do Centro de Custo (Aprovador)
    const approverId = project.costCenter.managerId;
    try {
      await NotificationService.createNotification(prisma,
        approverId,
        'Aprovação Necessária',
        `O projeto ${project.name} aguarda sua aprovação.`,
        'WARNING',
        `/projects/${projectId}`
      );

      // Notify via Email
      const approver = project.costCenter.manager;
      if (approver && approver.email) {
        const MailService = require('./mail.service');
        // TODO: Criar template específico para 'PROJECT_APPROVAL_REQUEST'
        await MailService.sendMail(prisma, {
          to: approver.email,
          subject: `[APROVAÇÃO] Projeto Pendente: ${project.name}`,
          html: `<p>Olá ${approver.name},</p><p>O projeto <b>${project.name}</b> (${project.code}) foi submetido para sua aprovação.</p><p>Acesse o sistema para analisar.</p>`,
          type: 'PROJECT_APPROVAL_REQUEST',
          module: 'PROJECTS'
        });
      }
    } catch (e) {
      logger.error('Falha ao notificar aprovador', e);
    }

    try {
      await notifyProjectBaselineTierApprovers(prisma, project, {
        alreadyNotifiedManagerId: approverId,
      });
    } catch (e) {
      logger.error('Falha ao notificar alçadas de projeto', e);
    }

    return updated;
  }

  static async approveProject(prisma, projectId, approverId, notes) {
    await this.getById(prisma, projectId, approverId);
    // Busca projeto com as relações necessárias para validação
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      // Agora validamos contra o CC do PROJETO, não do criador
      include: { costCenter: { include: { manager: true } } }
    });

    if (!project) throw { statusCode: 404, message: 'Projeto não encontrado' };

    if (project.approvalStatus !== 'PENDING_APPROVAL') {
      throw { statusCode: 400, message: 'Apenas projetos pendentes podem ser aprovados' };
    }

    if (!(await userCanApproveProjectBaseline(prisma, approverId, project))) {
      throw {
        statusCode: 403,
        message: 'Sem permissão para aprovar este projeto (gestor do CC, alçada parametrizada ou Super Admin).',
      };
    }

    const updated = await ProjectRepository.update(prisma, projectId, {
      approvalStatus: 'APPROVED',
      approvedBy: approverId,
      approvedAt: new Date(),
      status: 'PLANNING' // Transição automática para PLANNING após aprovação
    });

    await AuditLogRepository.create(prisma, {
      userId: approverId,
      action: 'aprovou projeto',
      module: 'PROJECTS',
      entityId: projectId,
      entityType: 'PROJECT',
      newData: { notes }
    });

    // Notificar criador e Tech Lead, não o manager (que acabou de aprovar)
    const creatorId = project.creatorId;
    if (creatorId && creatorId !== approverId) {
      await NotificationService.createNotification(prisma,
        creatorId,
        'Projeto Aprovado',
        `Seu projeto ${project.name} foi aprovado!`,
        'SUCCESS',
        `/projects/${projectId}`
      );

      // Email Notification to Creator
      try {
        const creator = await prisma.user.findUnique({ where: { id: creatorId } });
        if (creator && creator.email) {
          const MailService = require('./mail.service');
          await MailService.sendMail(prisma, {
            to: creator.email,
            subject: `[APROVADO] Projeto: ${project.name}`,
            html: EmailTemplateService.getProjectApprovalOutcomeTemplate(creator.name, project.name, projectId, 'APPROVED'),
            type: 'PROJECT_APPROVED',
            module: 'PROJECTS'
          });
        }
      } catch (e) { logger.error('Error sending project approval email', e); }
    }

    // Se houver um Project Manager DEFINIDO (campo managerId projeto) e for diferente do aprovador (CC Manager)
    if (project.managerId && project.managerId !== approverId) {
      await NotificationService.createNotification(prisma,
        project.managerId,
        'Projeto Aprovado',
        `O projeto ${project.name} foi aprovado e está liberado.`,
        'SUCCESS',
        `/projects/${projectId}`
      );

      // Email Notification to Project Manager
      try {
        // Prevent duplicate email if manager == creator (unlikely given logic above but safe to check)
        if (project.managerId !== creatorId) {
          const manager = await prisma.user.findUnique({ where: { id: project.managerId } });
          if (manager && manager.email) {
            const MailService = require('./mail.service');
            await MailService.sendMail(prisma, {
              to: manager.email,
              subject: `[APROVADO] Projeto: ${project.name}`,
              html: EmailTemplateService.getProjectApprovalOutcomeTemplate(manager.name, project.name, projectId, 'APPROVED'),
              type: 'PROJECT_APPROVED',
              module: 'PROJECTS'
            });
          }
        }
      } catch (e) { logger.error('Error sending project approval email to manager', e); }
    }

    return updated;
  }

  static async rejectProject(prisma, projectId, approverId, reason, requiresAdjustment = false) {
    await this.getById(prisma, projectId, approverId);
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { costCenter: { include: { manager: true } } }
    });

    if (!project) throw { statusCode: 404, message: 'Projeto não encontrado' };

    if (project.approvalStatus !== 'PENDING_APPROVAL') {
      throw { statusCode: 400, message: 'Apenas projetos pendentes podem ser rejeitados' };
    }

    if (!(await userCanApproveProjectBaseline(prisma, approverId, project))) {
      throw {
        statusCode: 403,
        message: 'Sem permissão para rejeitar este projeto (gestor do CC, alçada parametrizada ou Super Admin).',
      };
    }

    // Se requer ajustes, volta para DRAFT para permitir edição e reenvio
    // Se rejeição definitiva, vai para REJECTED (somente leitura)
    const newApprovalStatus = requiresAdjustment ? 'DRAFT' : 'REJECTED';

    const updated = await ProjectRepository.update(prisma, projectId, {
      approvalStatus: newApprovalStatus,
      approvedBy: approverId,
      approvedAt: new Date(),
      rejectionReason: reason,
      requiresAdjustment: requiresAdjustment
    });

    await AuditLogRepository.create(prisma, {
      userId: approverId,
      action: requiresAdjustment ? 'rejeitou projeto (requer ajustes)' : 'rejeitou projeto (definitivo)',
      module: 'PROJECTS',
      entityId: projectId,
      entityType: 'PROJECT',
      newData: { reason, requiresAdjustment }
    });

    // Notificar criador
    const creatorId = project.creatorId;
    if (creatorId) {
      const adjustmentMsg = requiresAdjustment
        ? ' Ajuste o projeto e reenvie para aprovação.'
        : '';
      await NotificationService.createNotification(prisma,
        creatorId,
        requiresAdjustment ? 'Projeto Requer Ajustes' : 'Projeto Rejeitado',
        `O projeto ${project.name} foi rejeitado. Motivo: ${reason}.${adjustmentMsg}`,
        requiresAdjustment ? 'WARNING' : 'ERROR',
        `/projects`
      );

      // Email Logic
      try {
        const creator = await prisma.user.findUnique({ where: { id: creatorId } });
        if (creator && creator.email) {
          const MailService = require('./mail.service');
          await MailService.sendMail(prisma, {
            to: creator.email,
            subject: `[${requiresAdjustment ? 'AJUSTES' : 'REJEITADO'}] Projeto: ${project.name}`,
            html: EmailTemplateService.getProjectApprovalOutcomeTemplate(creator.name, project.name, projectId, requiresAdjustment ? 'REVISION_REQUESTED' : 'REJECTED', reason),
            type: 'PROJECT_REJECTED',
            module: 'PROJECTS'
          });
        }
      } catch (e) { logger.error('Error sending project rejection email', e); }
    }

    // Notificar manager do projeto se existir
    if (project.managerId && project.managerId !== creatorId) {
      await NotificationService.createNotification(prisma,
        project.managerId,
        requiresAdjustment ? 'Projeto Requer Ajustes' : 'Projeto Rejeitado',
        `O projeto ${project.name} foi rejeitado pelo financeiro/diretoria.`,
        requiresAdjustment ? 'WARNING' : 'ERROR',
        `/projects`
      );

      // Email Logic
      try {
        const manager = await prisma.user.findUnique({ where: { id: project.managerId } });
        if (manager && manager.email) {
          const MailService = require('./mail.service');
          await MailService.sendMail(prisma, {
            to: manager.email,
            subject: `[${requiresAdjustment ? 'AJUSTES' : 'REJEITADO'}] Projeto: ${project.name}`,
            html: EmailTemplateService.getProjectApprovalOutcomeTemplate(manager.name, project.name, projectId, requiresAdjustment ? 'REVISION_REQUESTED' : 'REJECTED', reason),
            type: 'PROJECT_REJECTED',
            module: 'PROJECTS'
          });
        }
      } catch (e) { logger.error('Error sending project rejection email to manager', e); }
    }

    return updated;
  }
  static async recalculateProgress(prisma, projectId) {
    const totalTasks = await prisma.projectTask.count({
      where: { projectId }
    });

    const completedTasks = await prisma.projectTask.count({
      where: {
        projectId,
        status: 'DONE'
      }
    });

    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    await ProjectRepository.update(prisma, projectId, { progress });

    return progress;
  }
}

module.exports = ProjectService;

