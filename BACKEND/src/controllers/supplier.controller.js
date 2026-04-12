const SupplierService = require('../services/supplier.service');
const yup = require('yup');

class SupplierController {
  static async create(req, res) {
    try {
      const schema = yup.object().shape({
        name: yup.string().required('Razão Social/Nome é obrigatório'),
        tradeName: yup.string(),
        document: yup.string().required('CNPJ/CPF é obrigatório'),
        documentType: yup.string().oneOf(['CNPJ', 'CPF', 'FOREIGN']).required('Tipo de documento é obrigatório'),
        email: yup.string().email(),
        phone: yup.string(),
        classification: yup.string().oneOf(['CRITICO', 'ESTRATEGICO', 'OPERACIONAL', 'OUTROS']).default('OUTROS'),
        bankName: yup.string(),
        bankAgency: yup.string(),
        bankAccount: yup.string()
      });

      await schema.validate(req.body);

      const userId = req.user ? req.user.userId : null;
      const supplier = await SupplierService.create(req.prisma, req.body, userId);

      return res.status(201).json(supplier);

    } catch (error) {
      if (error.name === 'ValidationError') return res.status(400).json({ error: error.message });
      throw error;
    }
  }

  static async index(req, res) {
    const suppliers = await SupplierService.getAll(req.prisma, req.user.userId);
    return res.status(200).json(suppliers);
  }

  static async show(req, res) {
    const { id } = req.params;
    const supplier = await SupplierService.getById(req.prisma, id, req.user.userId);
    return res.status(200).json(supplier);
  }

  static async update(req, res) {
    const { id } = req.params;
    const userId = req.user ? req.user.userId : null;
    const supplier = await SupplierService.update(req.prisma, id, req.body, userId);
    return res.status(200).json(supplier);
  }

  static async delete(req, res) {
    const { id } = req.params;
    const userId = req.user ? req.user.userId : null;
    await SupplierService.delete(req.prisma, id, userId);
    return res.status(204).send();
  }
}

module.exports = SupplierController;
