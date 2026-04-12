const SoftwareLicenseService = require('../services/software-license.service');
const yup = require('yup');

class SoftwareLicenseController {
  static async create(req, res) {
    try {
      const schema = yup.object().shape({
        name: yup.string().required('Nome do software é obrigatório'),
        vendor: yup.string().required('Fabricante é obrigatório (Ex: Microsoft, Adobe)'),
        licenseKey: yup.string(), // Chave pode ser opcional (SaaS as vezes não tem)
        licenseType: yup.string().oneOf(['PERPETUA', 'ASSINATURA', 'OEM', 'VOLUME']).required(),
        quantity: yup.number().integer().min(1).default(1),
        purchaseDate: yup.date().nullable(),
        expirationDate: yup.date().nullable(),
        cost: yup.number().nullable()
      });

      await schema.validate(req.body);
      const { tenantId } = req.user;

      const license = await SoftwareLicenseService.create(req.prisma, tenantId, req.body, req.user.userId);
      return res.status(201).json(license);

    } catch (error) {
      if (error.name === 'ValidationError') return res.status(400).json({ error: error.message });
      throw error;
    }
  }

  static async index(req, res) {
    const { tenantId } = req.user;
    const licenses = await SoftwareLicenseService.getAll(req.prisma, tenantId, req.user.userId);
    return res.status(200).json(licenses);
  }

  static async show(req, res) {
    const { tenantId } = req.user;
    const { id } = req.params;
    const license = await SoftwareLicenseService.getById(req.prisma, id, tenantId, req.user.userId);
    return res.status(200).json(license);
  }

  static async update(req, res) {
    const { tenantId } = req.user;
    const { id } = req.params;
    const license = await SoftwareLicenseService.update(req.prisma, id, tenantId, req.body, req.user.userId);
    return res.status(200).json(license);
  }

  static async delete(req, res) {
    const { tenantId } = req.user;
    const { id } = req.params;
    await SoftwareLicenseService.delete(req.prisma, id, tenantId, req.user.userId);
    return res.status(204).send();
  }
}

module.exports = SoftwareLicenseController;
