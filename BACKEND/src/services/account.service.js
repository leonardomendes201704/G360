const AccountRepository = require('../repositories/account.repository');

class AccountService {
  static async create(prisma, data) {
    // 1. Verificar duplicidade de código
    const existing = await AccountRepository.findByCode(prisma, data.code);
    if (existing) {
      const error = new Error('Já existe uma conta contábil com este código.');
      error.statusCode = 409;
      throw error;
    }

    // 2. Se tiver conta pai, verificar se existe
    if (data.parentId) {
      const parent = await AccountRepository.findById(prisma, data.parentId);
      if (!parent) {
        const error = new Error('Conta pai não encontrada.');
        error.statusCode = 400;
        throw error;
      }
    }

    return AccountRepository.create(prisma, data);
  }

  static async getAll(prisma) {
    return AccountRepository.findAll(prisma);
  }

  // Busca contas visíveis para um centro de custo específico
  static async getAllForCostCenter(prisma, costCenterId) {
    if (!costCenterId) {
      return AccountRepository.findAll(prisma);
    }
    return AccountRepository.findAllForCostCenter(prisma, costCenterId);
  }

  static async update(prisma, id, data) {
    const account = await AccountRepository.findById(prisma, id);
    if (!account) {
      const error = new Error('Conta contábil não encontrada.');
      error.statusCode = 404;
      throw error;
    }
    return AccountRepository.update(prisma, id, data);
  }

  // Verifica dependências de uma conta
  static async checkDependencies(prisma, id) {
    return AccountRepository.checkDependencies(prisma, id);
  }

  static async delete(prisma, id) {
    const account = await AccountRepository.findById(prisma, id);
    if (!account) {
      const error = new Error('Conta contábil não encontrada.');
      error.statusCode = 404;
      throw error;
    }

    // Verificar se há dependências
    const deps = await AccountRepository.checkDependencies(prisma, id);
    if (deps && deps.hasDependencies) {
      const parts = [];
      if (deps.budgetItemsCount > 0) parts.push(`${deps.budgetItemsCount} item(ns) de orçamento`);
      if (deps.expensesCount > 0) parts.push(`${deps.expensesCount} despesa(s)`);
      if (deps.contractsCount > 0) parts.push(`${deps.contractsCount} contrato(s)`);

      const error = new Error(
        `Não é possível excluir esta conta. Ela está vinculada a: ${parts.join(', ')}. ` +
        `Sugerimos desativar a conta para impedir novos lançamentos.`
      );
      error.statusCode = 400;
      error.dependencies = deps.samples;
      throw error;
    }

    return AccountRepository.delete(prisma, id);
  }
}

module.exports = AccountService;