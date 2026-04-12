const ContractRepository = require('../repositories/contract.repository');
const SupplierRepository = require('../repositories/supplier.repository');
const CostCenterRepository = require('../repositories/cost-center.repository');
const AccountRepository = require('../repositories/account.repository');
const NotificationService = require('./notification.service');
const AuditLogRepository = require('../repositories/audit-log.repository');
const { getUserAccessScope } = require('../utils/access-scope');
const logger = require('../config/logger');

class ContractService {

  // --- LÓGICA DE CÁLCULO FINANCEIRO ---
  static calculateTotalValue(data) {
    if (!data.monthlyValue || Number(data.monthlyValue) === 0) {
      return Number(data.value);
    }

    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    const monthly = Number(data.monthlyValue);
    const rate = data.readjustmentRate ? Number(data.readjustmentRate) / 100 : 0;
    const baseDate = data.signatureDate ? new Date(data.signatureDate) : new Date(start);

    let total = 0;
    let currentMonthly = monthly;
    let currentDate = new Date(start);
    let nextAdjustment = new Date(baseDate);
    nextAdjustment.setFullYear(nextAdjustment.getFullYear() + 1);

    while (currentDate < end) {
      if (currentDate >= nextAdjustment && rate > 0) {
        currentMonthly = currentMonthly * (1 + rate);
        nextAdjustment.setFullYear(nextAdjustment.getFullYear() + 1);
      }
      total += currentMonthly;
      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    return total;
  }

  static async create(prisma, userId, data) {
    // Auto-generate contract number if not provided
    if (!data.number) {
      const year = new Date().getFullYear();
      const lastNumber = await ContractRepository.findLastContractNumber(prisma);
      if (lastNumber) {
        const match = lastNumber.match(/CT-(\d{4})-(\d+)/);
        if (match) {
          const lastYear = parseInt(match[1], 10);
          const lastSeq = parseInt(match[2], 10);
          const nextSeq = lastYear === year ? lastSeq + 1 : 1;
          data.number = `CT-${year}-${String(nextSeq).padStart(4, '0')}`;
        } else {
          data.number = `CT-${year}-0001`;
        }
      } else {
        data.number = `CT-${year}-0001`;
      }
    }

    const start = new Date(data.startDate);
    const end = new Date(data.endDate);

    if (end <= start) {
      throw { statusCode: 400, message: 'Data Final deve ser maior que Inicial' };
    }

    const supplier = await SupplierRepository.findById(prisma, data.supplierId);
    if (!supplier) throw { statusCode: 404, message: 'Fornecedor não encontrado' };

    if (data.costCenterId) {
      const cc = await CostCenterRepository.findById(prisma, data.costCenterId);
      if (!cc) throw { statusCode: 404, message: 'Centro de Custo nao encontrado' };
    }
    if (userId && data.costCenterId) {
      const scope = await getUserAccessScope(prisma, userId);
      if (scope.isAdmin === false && !scope.accessibleCostCenterIds.includes(data.costCenterId)) {
        throw { statusCode: 403, message: 'Acesso negado.' };
      }
    }
    if (data.accountId) {
      const acc = await AccountRepository.findById(prisma, data.accountId);
      if (!acc) throw { statusCode: 404, message: 'Conta Contábil não encontrada' };
    }

    const calculatedTotal = ContractService.calculateTotalValue(data);

    const validAttachments = (data.attachments || []).filter(att => att && att.fileName && att.fileUrl);

    const contract = await ContractRepository.create(prisma, {
      ...data,
      value: calculatedTotal,
      originalValue: calculatedTotal,
      startDate: start,
      endDate: end,
      signatureDate: data.signatureDate ? new Date(data.signatureDate) : null,
      status: data.status || 'ACTIVE',
      // tenantId removed
      attachments: validAttachments.length > 0 ? {
        create: validAttachments.map(att => ({
          fileName: att.fileName,
          fileUrl: att.fileUrl,
          type: att.type || 'OUTROS',
          uploadedBy: userId,
          // Campos obrigatórios no schema - usar valores padrão se não fornecidos
          fileSize: att.fileSize || 0,
          mimeType: att.mimeType || 'application/octet-stream'
        }))
      } : undefined
    });

    try {
      if (contract.costCenterId) {
        const cc = await CostCenterRepository.findById(prisma, contract.costCenterId);
        const managerId = cc?.department?.managerId;
        if (managerId) {
          await NotificationService.createNotification(prisma,
            managerId,
            'Novo Contrato Criado',
            `Um novo contrato com fornecedor ${supplier.name} foi criado para o seu departamento.`,
            'INFO',
            `/contracts/${contract.id}`
          );

          // Email Notification
          try {
            const manager = await prisma.user.findUnique({ where: { id: managerId } });
            if (manager && manager.email) {
              const EmailTemplateService = require('./email-template.service');
              const MailService = require('./mail.service');
              await MailService.sendMail(prisma, {
                to: manager.email,
                subject: `[CONTRATO] Novo: ${contract.number}`,
                html: EmailTemplateService.getContractActionTemplate(manager.name, contract.number, supplier.name, 'Criado', `Valor Total: R$ ${calculatedTotal}`),
                type: 'CONTRACT_CREATED',
                module: 'CONTRACTS'
              });
            }
          } catch (e) { logger.error('Error sending contract creation email', e); }
        }
      }
    } catch (e) { logger.error('Error notifying contract creation', e); }

    try {
      if (userId) { // Only log if we have a userId
        await AuditLogRepository.create(prisma, {
          userId,
          action: 'criou contrato',
          module: 'CONTRACTS',
          entityId: contract.id,
          entityType: 'CONTRACT',
          newData: contract
        });
      }
    } catch (e) { logger.error('Error creating audit log for contract creation', e); }

    return contract;
  }

  static async update(prisma, id, data, userId) {
    const currentContract = await this.getById(prisma, id, userId);

    const {
      id: _id, createdAt, updatedAt,
      supplier, costCenter, account, revisions, attachments, addendums, assets, expenses,
      ...updateData
    } = data;

    if (updateData.startDate) updateData.startDate = new Date(updateData.startDate);
    if (updateData.endDate) updateData.endDate = new Date(updateData.endDate);
    if (updateData.signatureDate) updateData.signatureDate = new Date(updateData.signatureDate);

    if (updateData.monthlyValue || updateData.readjustmentRate || updateData.startDate || updateData.endDate) {
      const currentContract = await ContractRepository.findById(prisma, id);
      const mergeData = {
        ...currentContract,
        ...updateData,
        monthlyValue: updateData.monthlyValue ?? currentContract.monthlyValue,
        readjustmentRate: updateData.readjustmentRate ?? currentContract.readjustmentRate,
        startDate: updateData.startDate ?? new Date(currentContract.startDate),
        endDate: updateData.endDate ?? new Date(currentContract.endDate),
        signatureDate: updateData.signatureDate ?? (currentContract.signatureDate ? new Date(currentContract.signatureDate) : null)
      };

      updateData.value = ContractService.calculateTotalValue(mergeData);
    }

    const updatedContract = await ContractRepository.update(prisma, id, updateData);

    // Se status mudou para INACTIVE/TERMINATED
    if (updateData.status && ['INACTIVE', 'TERMINATED', 'EXPIRED'].includes(updateData.status)) {
      try {
        // Fetch to get Department Manager
        const fullContract = await prisma.contract.findUnique({
          where: { id },
          include: { costCenter: { include: { department: true } } }
        });
        const managerId = fullContract?.costCenter?.department?.managerId;
        if (managerId) {
          await NotificationService.createNotification(prisma,
            managerId,
            `Contrato ${updateData.status === 'TERMINATED' ? 'Encerrado' : 'Inativado'}`,
            `O contrato ${fullContract.number} teve seu status alterado para ${updateData.status}.`,
            'WARNING',
            `/contracts/${id}`
          );
        }
      } catch (e) {
        logger.error('Error notifying contract update', e);
      }
    }

    // [NEW] Detect Renewal or Additive (Value/Date change)
    if (updateData.endDate || updateData.value || updateData.monthlyValue) {
      try {
        const fullContract = await prisma.contract.findUnique({
          where: { id },
          include: { costCenter: { include: { department: true } }, supplier: true }
        });
        const managerId = fullContract?.costCenter?.department?.managerId;

        if (managerId) {
          const isRenewal = updateData.endDate && new Date(updateData.endDate) > new Date(currentContract.endDate);
          const isAdditive = (updateData.value && Number(updateData.value) > Number(currentContract.value)) ||
            (updateData.monthlyValue && Number(updateData.monthlyValue) > Number(currentContract.monthlyValue));

          let actionType = null;
          if (isRenewal) actionType = 'Renovado';
          else if (isAdditive) actionType = 'Aditivado';

          if (actionType) {
            await NotificationService.createNotification(prisma,
              managerId,
              `Contrato ${actionType}`,
              `O contrato ${fullContract.number} foi ${actionType.toLowerCase()}.`,
              'INFO',
              `/contracts/${id}`
            );

            const manager = await prisma.user.findUnique({ where: { id: managerId } });
            if (manager && manager.email) {
              const EmailTemplateService = require('./email-template.service');
              const MailService = require('./mail.service');
              await MailService.sendMail(prisma, {
                to: manager.email,
                subject: `[CONTRATO] ${actionType}: ${fullContract.number}`,
                html: EmailTemplateService.getContractActionTemplate(manager.name, fullContract.number, fullContract.supplier.name, actionType, isRenewal ? `Nova Vencimento: ${fullContract.endDate.toLocaleDateString()}` : `Novo Valor: R$ ${fullContract.value}`),
                type: 'CONTRACT_UPDATED',
                module: 'CONTRACTS'
              });
            }
          }
        }
      } catch (e) { logger.error('Error sending contract update email', e); }
    }

    try {
      if (userId) {
        await AuditLogRepository.create(prisma, {
          userId: userId,
          action: 'atualizou contrato',
          module: 'CONTRACTS',
          entityId: id,
          entityType: 'CONTRACT',
          oldData: currentContract,
          newData: updatedContract
        });
      }
    } catch (e) { logger.error('Error creating audit log for contract update', e); }

    return updatedContract;
  }

  static async getAll(prisma, filters, userId) {
    const scope = await getUserAccessScope(prisma, userId);
    return ContractRepository.findAll(prisma, filters, scope);
  }

  static async getById(prisma, id, userId) {
    const contract = await ContractRepository.findById(prisma, id);
    if (!contract) throw { statusCode: 404, message: 'Contrato nao encontrado.' };
    if (userId) {
      const scope = await getUserAccessScope(prisma, userId);
      if (scope.isAdmin === false) {
        const allowed = contract.costCenterId && scope.accessibleCostCenterIds.includes(contract.costCenterId);
        if (!allowed) throw { statusCode: 403, message: 'Acesso negado.' };
      }
    }
    return contract;
  }

  static async delete(prisma, id, userId) {
    const contract = await this.getById(prisma, id, userId);

    // Basic Validation: Cannot delete if it has Assets or Expenses linked
    const assetsCount = await prisma.asset.count({ where: { contractId: id } });
    if (assetsCount > 0) throw { statusCode: 400, message: 'Não é possível excluir: Contrato possui ativos vinculados.' };

    const expensesCount = await prisma.expense.count({ where: { contractId: id } });
    if (expensesCount > 0) throw { statusCode: 400, message: 'Não é possível excluir: Contrato possui despesas vinculadas.' };

    // Notify before delete
    try {
      if (contract.costCenterId) {
        const cc = await CostCenterRepository.findById(prisma, contract.costCenterId);
        const managerId = cc?.department?.managerId;
        if (managerId) {
          await NotificationService.createNotification(prisma,
            managerId,
            'Contrato Excluído',
            `O contrato ${contract.number} foi excluído do sistema.`,
            'ERROR',
            `/contracts`
          );
        }
      }
    } catch (e) { logger.error('Error notifying contract deletion', e); }

    const result = await ContractRepository.delete(prisma, id);

    try {
      if (userId) {
        await AuditLogRepository.create(prisma, {
          userId: userId,
          action: 'excluiu contrato',
          module: 'CONTRACTS',
          entityId: id,
          entityType: 'CONTRACT',
          oldData: contract
        });
      }
    } catch (e) { logger.error('Error creating audit log for contract deletion', e); }

    return result;
  }
}

module.exports = ContractService;




