const AssetMaintenanceRepository = require('../repositories/asset-maintenance.repository');
const AssetRepository = require('../repositories/asset.repository');
const AssetService = require('./asset.service');
class AssetMaintenanceService {
  static async create(prisma, tenantId, assetId, data, userId) {
    // 1. Validar se o ativo existe e pertence ao escopo
    const asset = await AssetService.getById(assetId, userId);
    if (!asset) throw { statusCode: 404, message: 'Ativo não encontrado.' };

    // 2. Tratamento de Datas
    const start = new Date(data.startDate);
    const end = data.endDate ? new Date(data.endDate) : null;

    if (end && end < start) throw { statusCode: 400, message: 'Data de término deve ser maior que a de início.' };

    // 3. Criar Manutenção
    const maintenance = await AssetMaintenanceRepository.create(prisma, {
      ...data,
      assetId,
      startDate: start,
      endDate: end
    });

    // 4. Atualizar status do Ativo se a manutenção estiver "EM ANDAMENTO"
    if (data.status === 'EM_ANDAMENTO') {
        await AssetRepository.update(prisma, assetId, { status: 'MANUTENCAO' });
    } 
    // Se a manutenção for concluída e o ativo estava em manutenção, volta para PROPRIO? 
    // Melhor deixar o usuário decidir o status final manualmente ou criar lógica complexa depois.

    return maintenance;
  }

  static async getAll(prisma, tenantId, assetId, userId) {
    // Valida acesso ao ativo
    const asset = await AssetService.getById(assetId, userId);
    if (!asset) throw { statusCode: 404, message: 'Ativo não encontrado.' };

    return AssetMaintenanceRepository.findAll(prisma, assetId);
  }

  static async update(prisma, id, tenantId, data, userId) {
    // Apenas validação básica de existência, assumindo que o ID é único globalmente
    // Idealmente buscaria a manutenção e verificaria o tenant do asset pai
    const { startDate, endDate, ...rest } = data;

    const maintenance = await prisma.assetMaintenance.findUnique({ where: { id } });
    if (!maintenance) throw { statusCode: 404, message: 'Manutenção não encontrada.' };
    await AssetService.getById(maintenance.assetId, userId);

    const updateData = { ...rest };
    if (startDate) updateData.startDate = new Date(startDate);
    if (endDate) updateData.endDate = new Date(endDate);

    return AssetMaintenanceRepository.update(prisma, id, updateData);
  }

  static async delete(prisma, id, userId) {
    const maintenance = await prisma.assetMaintenance.findUnique({ where: { id } });
    if (!maintenance) throw { statusCode: 404, message: 'Manutenção não encontrada.' };
    await AssetService.getById(maintenance.assetId, userId);
    return AssetMaintenanceRepository.delete(prisma, id);
  }
}

module.exports = AssetMaintenanceService;
