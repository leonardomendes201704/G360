const AssetRepository = require('../repositories/asset.repository');
const AssetCategoryRepository = require('../repositories/asset-category.repository');
const SupplierRepository = require('../repositories/supplier.repository');
const NotificationService = require('./notification.service');
const AuditLogRepository = require('../repositories/audit-log.repository');
const ContractRepository = require('../repositories/contract.repository'); // Assuming this exists or use prisma directly if not
const CostCenterRepository = require('../repositories/cost-center.repository'); // Assuming this exists
const { getUserAccessScope } = require('../utils/access-scope');
const logger = require('../config/logger');

class AssetService {
  static async create(prisma, data) {
    const existingAsset = await AssetRepository.findByCode(prisma, data.code);
    if (existingAsset) {
      const error = new Error(`Já existe um ativo com o código ${data.code}.`);
      error.statusCode = 409;
      throw error;
    }

    const category = await AssetCategoryRepository.findById(prisma, data.categoryId);
    if (!category) {
      const error = new Error('Categoria não encontrada.');
      error.statusCode = 404;
      throw error;
    }

    if (data.supplierId) {
      const supplier = await SupplierRepository.findById(prisma, data.supplierId);
      if (!supplier) {
        const error = new Error('Fornecedor não encontrado.');
        error.statusCode = 404;
        throw error;
      }
    }

    if (data.contractId) {
      const contract = await ContractRepository.findById(prisma, data.contractId);
      if (!contract) {
        const error = new Error('Contrato não encontrado.');
        error.statusCode = 404;
        throw error;
      }
    }

    if (data.costCenterId) {
      const costCenter = await CostCenterRepository.findById(prisma, data.costCenterId);
      if (!costCenter) {
        const error = new Error('Centro de Custo nao encontrado.');
        error.statusCode = 404;
        throw error;
      }
    }
    if (data.userId && data.costCenterId) {
      const scope = await getUserAccessScope(prisma, data.userId);
      if (scope.isAdmin === false && !scope.accessibleCostCenterIds.includes(data.costCenterId)) {
        const error = new Error('Acesso negado.');
        error.statusCode = 403;
        throw error;
      }
    }

    if (data.acquisitionDate) {
      data.acquisitionDate = new Date(data.acquisitionDate);
    }

    const { userId, createdBy, tenantId, ...assetData } = data;

    const asset = await AssetRepository.create(prisma, {
      ...assetData
      // tenantId removed
    });

    try {
      // Notificar Admins
      const admins = await prisma.user.findMany({ where: { role: { name: 'ADMIN' } } });
      for (const admin of admins) {
        await NotificationService.createNotification(prisma,
          admin.id,
          'Novo Ativo Cadastrado',
          `Um novo ativo ${asset.name} (${asset.code}) foi cadastrado.`,
          'INFO',
          `/assets`
        );
      }
    } catch (e) { }

    try {
      await AuditLogRepository.create(prisma, {
        userId: data.createdBy || 'system',
        action: 'registrou ativo',
        module: 'ASSETS',
        entityId: asset.id,
        entityType: 'ASSET',
        newData: asset
      });
    } catch (e) {
      logger.error('Falha ao registrar auditoria de ativo', e);
    }

    return asset;
  }

  static async getAll(prisma, filters, userId) {
    const scope = await getUserAccessScope(prisma, userId);
    return AssetRepository.findAll(prisma, filters, scope);
  }

  static async getById(prisma, id, userId) {
    const asset = await AssetRepository.findById(prisma, id);
    if (!asset) {
      const error = new Error('Ativo nao encontrado.');
      error.statusCode = 404;
      throw error;
    }
    if (userId) {
      const scope = await getUserAccessScope(prisma, userId);
      if (scope.isAdmin === false) {
        const allowed = asset.costCenterId && scope.accessibleCostCenterIds.includes(asset.costCenterId);
        if (!allowed) {
          const error = new Error('Acesso negado.');
          error.statusCode = 403;
          throw error;
        }
      }
    }
    return asset;
  }

  static async update(prisma, id, data) {
    await this.getById(prisma, id, data.userId);

    const {
      id: _id,
      createdAt,
      updatedAt,
      category,
      supplier,
      contract,
      costCenter,
      maintenances,
      changes,
      userId,
      assetType,
      ...updateData
    } = data;

    if (updateData.acquisitionDate) {
      updateData.acquisitionDate = new Date(updateData.acquisitionDate);
    }

    const oldData = await this.getById(prisma, id, data.userId);
    const updated = await AssetRepository.update(prisma, id, updateData);

    try {
      await AuditLogRepository.create(prisma, {
        userId: data.userId || 'system',
        action: 'atualizou ativo',
        module: 'ASSETS',
        entityId: id,
        entityType: 'ASSET',
        oldData,
        newData: updated
      });
    } catch (e) { logger.error('Audit Log Error', e); }

    return updated;
  }

  static async delete(prisma, id, userId) {
    const asset = await this.getById(prisma, id, userId);
    await AssetRepository.delete(prisma, id);

    try {
      const admins = await prisma.user.findMany({ where: { role: { name: 'ADMIN' } } });
      for (const admin of admins) {
        await NotificationService.createNotification(prisma,
          admin.id,
          'Ativo Removido',
          `O ativo ${asset.name} (${asset.code}) foi excluído.`,
          'WARNING',
          `/assets`
        );
      }
    } catch (e) { }

    try {
      await AuditLogRepository.create(prisma, {
        userId: 'system',
        action: 'baixou ativo',
        module: 'ASSETS',
        entityId: id,
        entityType: 'ASSET',
        oldData: asset
      });
    } catch (e) { logger.error('Audit Log Error', e); }

    return true;
  }
}

module.exports = AssetService;









