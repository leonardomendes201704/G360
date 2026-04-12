const AssetService = require('../services/asset.service');
const yup = require('yup');

class AssetController {
  static async create(req, res) {
    try {
      const emptyToNull = (value, originalValue) => (originalValue === '' ? null : value);
      const schema = yup.object().shape({
        code: yup.string().required('Código do ativo/Património é obrigatório'),
        name: yup.string().required('Nome do ativo é obrigatório'),
        categoryId: yup.string().uuid().required('Categoria é obrigatória'),
        supplierId: yup.string().uuid().nullable().transform(emptyToNull),
        contractId: yup.string().uuid().nullable().transform(emptyToNull),
        costCenterId: yup.string().uuid().nullable().transform(emptyToNull),

        status: yup.string().oneOf(['PROPRIO', 'LOCADO', 'MANUTENCAO', 'DESATIVADO']).default('PROPRIO'),
        acquisitionDate: yup.date().nullable().transform(emptyToNull),
        acquisitionValue: yup.number().nullable().transform(emptyToNull),

        rentValue: yup.number().nullable().transform(emptyToNull),

        serialNumber: yup.string(),
        location: yup.string(),
        assignedTo: yup.string(),

        invoiceUrl: yup.string().nullable(),
        invoiceName: yup.string().nullable()
      });

      const payload = await schema.validate(req.body, { stripUnknown: true });

      const asset = await AssetService.create(req.prisma, { ...payload, userId: req.user.userId, createdBy: req.user.userId });
      return res.status(201).json(asset);

    } catch (error) {
      if (error.name === 'ValidationError') return res.status(400).json({ error: error.message });
      throw error;
    }
  }

  static async index(req, res) {
    const { userId } = req.user;
    const assets = await AssetService.getAll(req.prisma, req.query, userId);
    return res.status(200).json(assets);
  }

  static async show(req, res) {
    const { id } = req.params;
    const { userId } = req.user;
    const asset = await AssetService.getById(req.prisma, id, userId);
    return res.status(200).json(asset);
  }

  static async update(req, res) {
    const { id } = req.params;
    const asset = await AssetService.update(req.prisma, id, { ...req.body, userId: req.user.userId });
    return res.status(200).json(asset);
  }

  static async delete(req, res) {
    const { id } = req.params;
    await AssetService.delete(req.prisma, id, req.user.userId);
    return res.status(204).send();
  }
}

module.exports = AssetController;
