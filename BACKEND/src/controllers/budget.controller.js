const BudgetService = require('../services/budget.service');
const yup = require('yup');

class BudgetController {
  static async create(req, res) {
    try {
      const schema = yup.object().shape({
        name: yup.string().required(),
        fiscalYearId: yup.string().uuid().required(),
        description: yup.string(),
        type: yup.string().oneOf(['OPEX', 'CAPEX', 'MIXED']).default('MIXED'),
        isOBZ: yup.boolean().default(false)
      });
      await schema.validate(req.body);

      const data = { ...req.body, createdBy: req.user?.userId || req.user?.id };
      const budget = await BudgetService.create(req.prisma, data);
      return res.status(201).json(budget);
    } catch (error) { return res.status(400).json({ error: error.message }); }
  }

  static async index(req, res) {
    const budgets = await BudgetService.getAll(req.prisma, req.user.userId);
    return res.status(200).json(budgets);
  }

  static async show(req, res) {
    const budget = await BudgetService.getById(req.prisma, req.params.id, req.user.userId);
    return res.status(200).json(budget);
  }

  static async update(req, res) {
    try {
      const { id } = req.params;
      const budget = await BudgetService.update(req.prisma, id, { ...req.body, userId: req.user.userId });
      return res.status(200).json(budget);
    } catch (error) { return res.status(400).json({ error: error.message }); }
  }

  static async delete(req, res) {
    try {
      const { id } = req.params;
      await BudgetService.delete(req.prisma, id, req.user.userId);
      return res.status(204).send();
    } catch (error) { return res.status(400).json({ error: error.message }); }
  }

  static async approve(req, res) {
    try {
      const userId = req.user.userId || req.user.id;
      const { id } = req.params;
      const budget = await BudgetService.approve(req.prisma, id, userId);
      return res.status(200).json(budget);
    } catch (error) {
      const code = error.statusCode || 400;
      return res.status(code).json({ error: error.message });
    }
  }

  static async submitForApproval(req, res) {
    try {
      const userId = req.user.userId || req.user.id;
      const { id } = req.params;
      const budget = await BudgetService.submitForApproval(req.prisma, id, userId);
      return res.status(200).json(budget);
    } catch (error) {
      const code = error.statusCode || 400;
      return res.status(code).json({ error: error.message });
    }
  }

  static async duplicate(req, res) {
    try {
      const { id } = req.params;
      const { newName } = req.body;

      if (!newName || newName.trim() === '') {
        return res.status(400).json({ error: 'O novo nome é obrigatório.' });
      }

      const userId = req.user.userId || req.user.id;
      const budget = await BudgetService.duplicate(req.prisma, id, newName, userId);
      return res.status(201).json(budget);
    } catch (error) { return res.status(400).json({ error: error.message }); }
  }

  static async addItem(req, res) {
    try {
      const schema = yup.object().shape({
        accountId: yup.string().uuid().required('Conta Contábil é obrigatória'),
        costCenterId: yup.string().uuid().nullable(),
        supplierId: yup.string().uuid().nullable(),
        projectId: yup.string().uuid().nullable(),
        description: yup.string(),
        // OBZ Fields
        justification: yup.string().nullable(),
        priority: yup.string().oneOf(['ESSENCIAL', 'IMPORTANTE', 'DESEJAVEL', '', null]).nullable(),
        isNewExpense: yup.boolean().default(true),
        // Monthly values
        jan: yup.number().default(0),
        feb: yup.number().default(0),
        mar: yup.number().default(0),
        apr: yup.number().default(0),
        may: yup.number().default(0),
        jun: yup.number().default(0),
        jul: yup.number().default(0),
        aug: yup.number().default(0),
        sep: yup.number().default(0),
        oct: yup.number().default(0),
        nov: yup.number().default(0),
        dec: yup.number().default(0)
      });

      await schema.validate(req.body);
      const { id } = req.params;

      const item = await BudgetService.addItem(req.prisma, id, req.body, req.user.userId);
      return res.status(201).json(item);

    } catch (error) { return res.status(400).json({ error: error.message }); }
  }

  static async updateItem(req, res) {
    try {
      const { itemId } = req.params;
      const item = await BudgetService.updateItem(req.prisma, itemId, req.body, req.user.userId);
      return res.status(200).json(item);
    } catch (error) { return res.status(400).json({ error: error.message }); }
  }

  static async deleteItem(req, res) {
    try {
      const { itemId } = req.params;
      await BudgetService.deleteItem(req.prisma, itemId, req.user.userId);
      return res.status(204).send();
    } catch (error) { return res.status(400).json({ error: error.message }); }
  }

  static async importItems(req, res) {
    const fs = require('fs');
    try {
      const { id } = req.params;
      if (!req.file) throw { statusCode: 400, message: 'Nenhum arquivo enviado.' };

      const buffer = fs.readFileSync(req.file.path);
      const result = await BudgetService.importItems(req.prisma, id, buffer, req.user.userId);

      // Limpar arquivo temporário
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);

      return res.status(200).json(result);

    } catch (error) {
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);

      // Retornar lista de erros caso exista
      return res.status(error.statusCode || 400).json({
        error: error.message,
        details: error.errors
      });
    }
  }
}

module.exports = BudgetController;
