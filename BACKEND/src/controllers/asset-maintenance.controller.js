const AssetMaintenanceService = require('../services/asset-maintenance.service');
const yup = require('yup');

class AssetMaintenanceController {
  static async create(req, res) {
    try {
      const { id: assetId } = req.params; // Vem da rota /assets/:id/maintenances
      const { tenantId } = req.user;

      const schema = yup.object().shape({
        type: yup.string().required('Tipo é obrigatório'),
        description: yup.string().required('Descrição é obrigatória'),
        startDate: yup.date().required('Data de início é obrigatória'),
        status: yup.string().default('AGENDADO'),
        cost: yup.number().nullable(),
        vendor: yup.string().nullable(),

        // ANEXOS
        invoiceUrl: yup.string().nullable(),
        invoiceName: yup.string().nullable()
      });

      await schema.validate(req.body);

      const maintenance = await AssetMaintenanceService.create(req.prisma, tenantId, assetId, req.body, req.user.userId);
      return res.status(201).json(maintenance);
    } catch (error) {
      return res.status(error.statusCode || 500).json({ message: error.message });
    }
  }

  static async index(req, res) {
    const { id: assetId } = req.params;
    const { tenantId } = req.user;
    const list = await AssetMaintenanceService.getAll(req.prisma, tenantId, assetId, req.user.userId);
    return res.status(200).json(list);
  }

  static async update(req, res) {
    const { maintenanceId } = req.params;
    const { tenantId } = req.user;
    const result = await AssetMaintenanceService.update(req.prisma, maintenanceId, tenantId, req.body, req.user.userId);
    return res.status(200).json(result);
  }

  static async delete(req, res) {
    const { maintenanceId } = req.params;
    await AssetMaintenanceService.delete(req.prisma, maintenanceId, req.user.userId);
    return res.status(204).send();
  }
}

module.exports = AssetMaintenanceController;
