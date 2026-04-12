const ExpenseRepository = require('../repositories/expense.repository');
const NotificationService = require('./notification.service');
const AuditLogRepository = require('../repositories/audit-log.repository');
const path = require('path');
const fs = require('fs');
const { getUserAccessScope, getScopedCostCenterIds } = require('../utils/access-scope');
const logger = require('../config/logger');

class ExpenseService {
  static async create(prisma, data) {
    const payload = {
      ...data,
      amount: Number(data.amount),
      date: new Date(data.date),
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      paymentDate: data.paymentDate ? new Date(data.paymentDate) : null,
      supplierId: data.supplierId || null,
      contractId: data.contractId || null,
      accountId: data.accountId || null,
      costCenterId: data.costCenterId || null,
    };

    if (data.createdBy && payload.costCenterId) {
      const scope = await getUserAccessScope(prisma, data.createdBy);
      // Allow Admin and Finance roles to create expenses for any cost center
      if (scope.isAdmin === false && scope.isFinance === false) {
        const allowedCostCenters = getScopedCostCenterIds(scope);
        if (!allowedCostCenters || !allowedCostCenters.includes(payload.costCenterId)) {
          throw { statusCode: 403, message: 'Acesso negado.' };
        }
      }
    }
    const expense = await ExpenseRepository.create(prisma, payload);

    try {
      let managerId = null;
      let context = '';

      if (expense.costCenterId) {
        const cc = await prisma.costCenter.findUnique({ where: { id: expense.costCenterId }, include: { department: true } });
        managerId = cc?.department?.managerId;
        context = `do seu centro de custo`;
      }

      if (managerId) {
        await NotificationService.createNotification(prisma,
          managerId,
          'Nova Despesa Lançada',
          `Uma nova despesa no valor de R$ ${expense.amount} foi lançada ${context}.`,
          'INFO',
          `/finance`
        );

        // Email: New Expense
        try {
          const manager = await prisma.user.findUnique({ where: { id: managerId } });
          if (manager && manager.email) {
            const EmailTemplateService = require('./email-template.service');
            const MailService = require('./mail.service');

            // 1. Notify New Expense
            await MailService.sendMail(prisma, {
              to: manager.email,
              subject: `[DESPESA] Nova: R$ ${expense.amount}`,
              html: EmailTemplateService.getExpenseCreatedTemplate(manager.name, expense.amount, 'Fornecedor', expense.description || 'Sem descrição', `/expenses/${expense.id}`),
              type: 'EXPENSE_CREATED',
              module: 'FINANCE'
            });

            // 2. CHECK BUDGET OVERFLOW
            if (expense.accountId) {
              const year = expense.date.getFullYear();
              const fiscalYear = await prisma.fiscalYear.findFirst({ where: { year } });

              if (fiscalYear) {
                const budget = await prisma.budget.findFirst({
                  where: { fiscalYearId: fiscalYear.id, status: 'APPROVED' },
                  include: { items: true }
                });

                if (budget) {
                  const budgetItem = budget.items.find(i =>
                    i.costCenterId === expense.costCenterId &&
                    i.accountId === expense.accountId
                  );

                  if (budgetItem) {
                    const expensesSum = await prisma.expense.aggregate({
                      where: {
                        costCenterId: expense.costCenterId,
                        accountId: expense.accountId,
                        date: {
                          gte: new Date(year, 0, 1),
                          lte: new Date(year, 11, 31)
                        },
                        // Exclude cancelled/rejected if needed? Assuming all created count or only approved?
                        // Usually "Provisão" counts.
                        status: { notIn: ['REJECTED', 'CANCELLED'] }
                      },
                      _sum: { amount: true }
                    });

                    const totalSpent = Number(expensesSum._sum.amount || 0);
                    const budgetLimit = Number(budgetItem.total);

                    if (totalSpent > budgetLimit) {
                      const overflow = totalSpent - budgetLimit;

                      // Notify Overflow
                      await NotificationService.createNotification(prisma,
                        managerId,
                        '🚨 Estouro de Orçamento',
                        `A despesa excedeu o orçamento da conta. Excedente: R$ ${overflow.toFixed(2)}`,
                        'ERROR',
                        `/finance`
                      );

                      await MailService.sendMail(prisma, {
                        to: manager.email,
                        subject: `[ALERTA] Estouro de Orçamento`,
                        html: EmailTemplateService.getBudgetOverflowTemplate(manager.name, 'seu Centro de Custo', totalSpent.toFixed(2), budgetLimit.toFixed(2), overflow.toFixed(2)),
                        type: 'BUDGET_OVERFLOW',
                        module: 'FINANCE'
                      });
                    }
                  }
                }
              }
            }
          }
        } catch (e) { logger.error('Error sending expense emails', e); }
      }
    } catch (e) {
      logger.error('Erro ao notificar despesa', e);
    }

    try {
      if (data.createdBy) {
        await AuditLogRepository.create(prisma, {
          userId: data.createdBy,
          action: 'criou despesa',
          module: 'FINANCE',
          entityId: expense.id,
          entityType: 'EXPENSE',
          newData: expense
        });
      }
    } catch (e) {
      logger.error('Falha ao registrar auditoria de despesa', e);
    }

    return expense;
  }

  static async update(prisma, id, tenantId, data, file) {
    const expense = await ExpenseRepository.findById(prisma, id);
    if (!expense) throw { statusCode: 404, message: 'Despesa nao encontrada.' };
    await this.assertAccess(prisma, expense, data.userId);

    // Bloqueio de Edição para Despesas Aprovadas/Pagas
    if (['APROVADO', 'APPROVED', 'PAGO'].includes(expense.status?.toUpperCase())) {
      // Se não estiver mudando o status (ex: revertendo), bloqueia
      if (!data.status || data.status === expense.status) {
        throw { statusCode: 403, message: 'Despesas Aprovadas ou Pagas não podem ser editadas.' };
      }
    }

    const payload = { ...data };

    if (payload.costCenterId) {
      const scope = await getUserAccessScope(prisma, data.userId);
      // Allow Admin and Finance roles to update expenses for any cost center
      if (scope.isAdmin === false && scope.isFinance === false) {
        const allowedCostCenters = getScopedCostCenterIds(scope);
        if (!allowedCostCenters || !allowedCostCenters.includes(payload.costCenterId)) {
          throw { statusCode: 403, message: 'Acesso negado.' };
        }
      }
    }

    if (payload.amount) payload.amount = Number(payload.amount);
    if (payload.date) payload.date = new Date(payload.date);

    if (payload.dueDate === '') payload.dueDate = null;
    else if (payload.dueDate) payload.dueDate = new Date(payload.dueDate);

    if (payload.paymentDate === '') payload.paymentDate = null;
    else if (payload.paymentDate) payload.paymentDate = new Date(payload.paymentDate);

    if (file) {
      if (expense.fileUrl) {
        const oldPath = path.join(__dirname, '..', '..', expense.fileUrl);
        try { if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath); } catch (e) { }
      }
      const uploadsRoot = path.resolve(__dirname, '..', '..');
      const relativePath = path.relative(uploadsRoot, file.path);
      payload.fileUrl = `/${relativePath.split(path.sep).join('/')}`;
      payload.fileName = file.originalname;
    }

    ['supplierId', 'contractId', 'costCenterId', 'accountId'].forEach(key => {
      if (payload[key] === '') payload[key] = null;
    });

    const { id: _id, tenantId: _t, createdAt, updatedAt, supplier, contract, account, costCenter, supplierId, contractId, costCenterId, accountId, userId, ...updateData } = payload;

    // Prisma requires nested relation syntax for updates
    if (supplierId !== undefined) {
      updateData.supplier = supplierId ? { connect: { id: supplierId } } : { disconnect: true };
    }
    if (contractId !== undefined) {
      updateData.contract = contractId ? { connect: { id: contractId } } : { disconnect: true };
    }
    if (costCenterId !== undefined) {
      updateData.costCenter = costCenterId ? { connect: { id: costCenterId } } : undefined;
    }
    if (accountId !== undefined) {
      updateData.account = accountId ? { connect: { id: accountId } } : { disconnect: true };
    }

    // Validar aprovação (Regra de Negócio: Aprovação requer NF e Arquivo)
    if (payload.status === 'APPROVED') {
      const hasInvoice = payload.invoiceNumber || expense.invoiceNumber;
      const hasFile = file || expense.fileUrl; // file is the new upload, expense.fileUrl is existing

      if (!hasInvoice || !hasInvoice.trim()) {
        throw { statusCode: 400, message: 'Para aprovar, é obrigatório informar o Número da NF.' };
      }
      if (!hasFile) {
        throw { statusCode: 400, message: 'Para aprovar, é obrigatório anexar a Nota Fiscal (PDF/Imagem).' };
      }

      // Auto-fill metadata
      updateData.approvedAt = new Date();
      updateData.approvedBy = data.userId;
    }

    const updated = await ExpenseRepository.update(prisma, id, updateData);

    try {
      await AuditLogRepository.create(prisma, {
        userId: data.userId || expense.userId || 'system',
        action: 'atualizou despesa',
        module: 'FINANCE',
        entityId: id,
        entityType: 'EXPENSE',
        oldData: expense,
        newData: updated
      });
    } catch (e) { logger.error('Audit Log Error', e); }

    return updated;
  }

  static async getAll(prisma, tenantId, filters, user) {
    const userId = user?.userId || user?.id;
    const scope = userId ? await getUserAccessScope(prisma, userId) : null;
    return ExpenseRepository.findAll(prisma, filters, userId, scope);
  }

  static async getById(prisma, id, tenantId, userId) {
    const expense = await ExpenseRepository.findById(prisma, id);
    if (!expense) throw { statusCode: 404, message: 'Despesa nao encontrada.' };
    await this.assertAccess(prisma, expense, userId);
    return expense;
  }

  static async delete(prisma, id, tenantId, userId) {
    const expense = await this.getById(prisma, id, tenantId, userId);

    if (expense.status === 'PAGO') {
      throw { statusCode: 403, message: 'Despesas PAGAS não podem ser excluídas diretamente. Solicite aprovação para exclusão.' };
    }

    if (expense.fileUrl) {
      const filePath = path.join(__dirname, '..', '..', expense.fileUrl);
      try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch (e) { }
    }

    await ExpenseRepository.delete(prisma, id);

    try {
      await AuditLogRepository.create(prisma, {
        userId: 'system',
        action: 'excluiu despesa',
        module: 'FINANCE',
        entityId: id,
        entityType: 'EXPENSE',
        oldData: expense
      });
    } catch (e) { logger.error('Audit Log Error', e); }

    return true;
  }

  static async assertAccess(prisma, expense, userId) {
    if (!userId || !expense) return;
    const scope = await getUserAccessScope(prisma, userId);
    if (scope.isAdmin) return;
    // Finance role has full access to all expenses
    if (scope.isFinance) return;

    if (scope.isManager) {
      if (!scope.accessibleCostCenterIds.includes(expense.costCenterId)) {
        throw { statusCode: 403, message: 'Acesso negado.' };
      }
      return;
    }

    if (expense.createdBy !== userId) {
      throw { statusCode: 403, message: 'Acesso negado.' };
    }
  }
}

module.exports = ExpenseService;







