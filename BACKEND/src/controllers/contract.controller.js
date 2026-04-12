const ContractService = require('../services/contract.service');
const yup = require('yup');

class ContractController {
  static async create(req, res) {
    try {
      const schema = yup.object().shape({
        supplierId: yup.string().uuid().required('Fornecedor é obrigatório'),
        costCenterId: yup.string().uuid().nullable(),
        accountId: yup.string().uuid().nullable(),

        number: yup.string().required('Número do contrato é obrigatório'),
        description: yup.string().required('Descrição é obrigatória'),
        type: yup.string().required(),

        monthlyValue: yup.number().nullable(),
        readjustmentRate: yup.number().nullable(),
        signatureDate: yup.date().nullable(),

        value: yup.number().when('monthlyValue', {
          is: (val) => !val || val === 0,
          then: () => yup.number().required('Valor Total é obrigatório (ou informe o mensal)'),
          otherwise: () => yup.number().nullable()
        }),

        startDate: yup.date().required('Data de início é obrigatória'),
        endDate: yup.date().required('Data de fim é obrigatória'),

        alertDays: yup.number().integer().default(30),
        autoRenew: yup.boolean().default(false)
      });

      await schema.validate(req.body);
      const { userId } = req.user;

      const contract = await ContractService.create(req.prisma, userId, req.body);
      return res.status(201).json(contract);

    } catch (error) {
      if (error.name === 'ValidationError') return res.status(400).json({ error: error.message });
      const status = error.statusCode || 500;
      return res.status(status).json({ error: error.message });
    }
  }

  static async index(req, res) {
    const { userId } = req.user;
    const contracts = await ContractService.getAll(req.prisma, req.query, userId);
    return res.status(200).json(contracts);
  }

  static async show(req, res) {
    const { userId } = req.user;
    const contract = await ContractService.getById(req.prisma, req.params.id, userId);
    return res.status(200).json(contract);
  }

  static async update(req, res) {
    const userId = req.user ? req.user.userId : null;
    const contract = await ContractService.update(req.prisma, req.params.id, req.body, userId);
    return res.status(200).json(contract);
  }

  static async delete(req, res) {
    const userId = req.user ? req.user.userId : null;
    await ContractService.delete(req.prisma, req.params.id, userId);
    return res.status(204).send();
  }
}

module.exports = ContractController;
