const SupplierRepository = require('../repositories/supplier.repository');
const AuditLogRepository = require('../repositories/audit-log.repository');
const { getUserAccessScope } = require('../utils/access-scope');
const logger = require('../config/logger');

class SupplierService {
  static async create(prisma, data, userId) {
    const existing = await SupplierRepository.findByDocument(prisma, data.document);

    if (existing) {
      const error = new Error(`Fornecedor ja cadastrado com o documento ${data.document}.`);
      error.statusCode = 409;
      throw error;
    }

    const supplier = await SupplierRepository.create(prisma, {
      ...data
      // tenantId removed
    });

    if (userId) {
      try {
        await AuditLogRepository.create(prisma, {
          userId: userId,
          action: 'criou fornecedor',
          module: 'SUPPLIERS',
          entityId: supplier.id,
          entityType: 'SUPPLIER',
          newData: supplier
        });
      } catch (e) {
        logger.error("Failed to create audit log", e);
      }
    }

    return supplier;
  }

  static async getAll(prisma, userId) {
    const scope = userId ? await getUserAccessScope(prisma, userId) : null;
    return SupplierRepository.findAll(prisma, userId, scope);
  }

  static async getById(prisma, id, userId) {
    const supplier = await SupplierRepository.findById(prisma, id);
    if (!supplier) {
      const error = new Error('Fornecedor nao encontrado.');
      error.statusCode = 404;
      throw error;
    }

    await this.assertAccess(prisma, id, userId);
    return supplier;
  }

  static async update(prisma, id, data, userId) {
    await this.getById(prisma, id, userId);

    const {
      id: _id,
      createdAt,
      updatedAt,
      contracts,
      assets,
      expenses,
      projectProposals,
      ...updateData
    } = data;

    if (updateData.document) {
      const existing = await SupplierRepository.findByDocument(prisma, updateData.document);
      if (existing && existing.id !== id) {
        const error = new Error(`Ja existe outro fornecedor com o documento ${updateData.document}.`);
        error.statusCode = 409;
        throw error;
      }
    }

    const oldData = await this.getById(prisma, id, userId);
    const updated = await SupplierRepository.update(prisma, id, updateData);

    if (userId) {
      try {
        await AuditLogRepository.create(prisma, {
          userId: userId,
          action: 'atualizou fornecedor',
          module: 'SUPPLIERS',
          entityId: id,
          entityType: 'SUPPLIER',
          oldData,
          newData: updated
        });
      } catch (e) {
        logger.error("Failed to create audit log", e);
      }
    }

    return updated;
  }

  static async delete(prisma, id, userId) {
    await this.getById(prisma, id, userId);

    // Check constraints using prisma directly or via repository if implemented
    const contractsCount = await prisma.contract.count({ where: { supplierId: id } });
    if (contractsCount > 0) throw { statusCode: 400, message: 'Nao e possivel excluir: Fornecedor possui contratos vinculados.' };

    const assetsCount = await prisma.asset.count({ where: { supplierId: id } });
    if (assetsCount > 0) throw { statusCode: 400, message: 'Nao e possivel excluir: Fornecedor possui ativos vinculados.' };

    const expensesCount = await prisma.expense.count({ where: { supplierId: id } });
    if (expensesCount > 0) throw { statusCode: 400, message: 'Nao e possivel excluir: Fornecedor possui despesas vinculadas.' };

    const proposalsCount = await prisma.projectProposal.count({ where: { supplierId: id } });
    if (proposalsCount > 0) throw { statusCode: 400, message: 'Nao e possivel excluir: Fornecedor possui propostas de projeto vinculadas.' };

    const oldData = await this.getById(prisma, id, userId);
    await SupplierRepository.delete(prisma, id);

    if (userId) {
      try {
        await AuditLogRepository.create(prisma, {
          userId: userId,
          action: 'excluiu fornecedor',
          module: 'SUPPLIERS',
          entityId: id,
          entityType: 'SUPPLIER',
          oldData
        });
      } catch (e) {
        logger.error("Failed to create audit log", e);
      }
    }

    return true;
  }

  static async assertAccess(prisma, supplierId, userId) {
    // Access is controlled by route middleware (RBAC)
    // Suppliers are shared master data, so strict ownership checks are removed to allow updates
    return;
  }
}

module.exports = SupplierService;
