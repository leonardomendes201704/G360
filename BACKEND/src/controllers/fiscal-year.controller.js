const FiscalYearService = require('../services/fiscal-year.service');
const yup = require('yup');

class FiscalYearController {
  static async create(req, res) {
    try {
      const schema = yup.object().shape({
        year: yup.number().integer().required('Ano é obrigatório (ex: 2024)'),
        startDate: yup.date().required('Data de início é obrigatória'),
        endDate: yup.date().required('Data de fim é obrigatória'),
        isClosed: yup.boolean().default(false)
      });

      await schema.validate(req.body);

      const fiscalYear = await FiscalYearService.create(req.prisma, req.body);
      return res.status(201).json(fiscalYear);

    } catch (error) {
      if (error.name === 'ValidationError') return res.status(400).json({ error: error.message });
      throw error;
    }
  }

  static async index(req, res) {
    const list = await FiscalYearService.getAll(req.prisma);
    return res.status(200).json(list);
  }

  static async update(req, res) {
    const { id } = req.params;
    const result = await FiscalYearService.update(req.prisma, id, req.body);
    return res.status(200).json(result);
  }

  static async delete(req, res) {
    const { id } = req.params;
    await FiscalYearService.delete(req.prisma, id);
    return res.status(204).send();
  }
}

module.exports = FiscalYearController;