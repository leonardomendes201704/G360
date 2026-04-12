const AccountService = require('../services/account.service');
const yup = require('yup');
const logger = require('../config/logger');

class AccountController {
  static async create(req, res) {
    try {
      const schema = yup.object().shape({
        code: yup.string().required('Código é obrigatório (Ex: 1.01.001)'),
        name: yup.string().required('Nome é obrigatório'),
        type: yup.string().oneOf(['OPEX', 'CAPEX', 'RECEITA']).required('Tipo é obrigatório'),
        parentId: yup.string().uuid().nullable().transform((v, o) => o === '' ? null : v),
        costCenterId: yup.string().uuid().nullable().transform((v, o) => o === '' ? null : v),
        isActive: yup.boolean().default(true)
      });

      // Valida e LIMPA o objeto (remove campos extras como id, createdAt, etc)
      const validData = await schema.validate(req.body, { stripUnknown: true });

      // Se não veio costCenterId no body, usar do usuário logado (se disponível)
      if (!validData.costCenterId && req.user?.costCenterId) {
        validData.costCenterId = req.user.costCenterId;
      }

      const account = await AccountService.create(req.prisma, validData);
      return res.status(201).json(account);

    } catch (error) {
      if (error.name === 'ValidationError') return res.status(400).json({ error: error.message });
      if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
      logger.error(error);
      return res.status(500).json({ error: 'Erro interno ao criar conta.' });
    }
  }

  static async index(req, res) {
    try {
      // Opcionalmente filtrar por centro de custo do usuário
      const costCenterId = req.query.costCenterId || req.user?.costCenterId;

      const accounts = costCenterId
        ? await AccountService.getAllForCostCenter(req.prisma, costCenterId)
        : await AccountService.getAll(req.prisma);

      return res.status(200).json(accounts);
    } catch (error) {
      logger.error(error);
      return res.status(500).json({ error: 'Erro ao listar contas.' });
    }
  }

  static async update(req, res) {
    try {
      const { id } = req.params;

      // Schema para update (campos opcionais)
      const schema = yup.object().shape({
        code: yup.string(),
        name: yup.string(),
        type: yup.string().oneOf(['OPEX', 'CAPEX', 'RECEITA']),
        parentId: yup.string().uuid().nullable().transform((v, o) => o === '' ? null : v),
        costCenterId: yup.string().uuid().nullable().transform((v, o) => o === '' ? null : v),
        isActive: yup.boolean()
      });

      // IMPORTANTE: { stripUnknown: true } remove campos que não estão no schema acima
      // Isso evita o erro de passar 'parent', 'children', 'createdAt' para o Prisma
      const validData = await schema.validate(req.body, { stripUnknown: true });

      const account = await AccountService.update(req.prisma, id, validData);
      return res.status(200).json(account);

    } catch (error) {
      if (error.name === 'ValidationError') return res.status(400).json({ error: error.message });
      if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
      logger.error(error);
      return res.status(500).json({ error: 'Erro ao atualizar conta.' });
    }
  }

  static async delete(req, res) {
    try {
      const { id } = req.params;
      await AccountService.delete(req.prisma, id);
      return res.status(204).send();
    } catch (error) {
      // Erros tratados pelo service (statusCode definido)
      if (error.statusCode) {
        return res.status(error.statusCode).json({
          error: error.message,
          dependencies: error.dependencies || null
        });
      }

      // Fallback para erros de FK não capturados pelo service
      const isForeignKeyError =
        error.code === 'P2003' ||
        error.message?.includes('23001') ||
        error.message?.includes('23503') ||
        error.message?.includes('foreign key constraint') ||
        error.name === 'PrismaClientUnknownRequestError';

      if (isForeignKeyError) {
        return res.status(400).json({
          error: 'Não é possível excluir esta conta pois ela está vinculada a registros do sistema. Sugerimos desativar a conta.'
        });
      }

      logger.error(error);
      return res.status(500).json({ error: 'Erro ao excluir conta.' });
    }
  }
}

module.exports = AccountController;