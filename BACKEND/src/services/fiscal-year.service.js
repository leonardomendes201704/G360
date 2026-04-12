const FiscalYearRepository = require('../repositories/fiscal-year.repository');

class FiscalYearService {
  static async create(prisma, data) {
    // 1. Validar unicidade do ano
    const existing = await FiscalYearRepository.findByYear(prisma, data.year);
    if (existing) {
      const error = new Error(`O ano fiscal ${data.year} já está registado.`);
      error.statusCode = 409;
      throw error;
    }

    // 2. Validar datas (conversão e lógica)
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      const error = new Error('Datas inválidas.');
      error.statusCode = 400;
      throw error;
    }

    if (end <= start) {
      const error = new Error('A Data Final deve ser posterior à Data Inicial.');
      error.statusCode = 400;
      throw error;
    }

    return FiscalYearRepository.create(prisma, {
      ...data,
      startDate: start,
      endDate: end
    });
  }

  static async getAll(prisma) {
    return FiscalYearRepository.findAll(prisma);
  }

  static async update(prisma, id, data) {
    const fiscalYear = await FiscalYearRepository.findById(prisma, id);
    if (!fiscalYear) {
      const error = new Error('Ano Fiscal não encontrado.');
      error.statusCode = 404;
      throw error;
    }

    // Tratamento de datas no update
    if (data.startDate) data.startDate = new Date(data.startDate);
    if (data.endDate) data.endDate = new Date(data.endDate);

    if (data.startDate && data.endDate && data.endDate <= data.startDate) {
      throw { statusCode: 400, message: 'Data Final deve ser maior que Inicial' };
    }

    return FiscalYearRepository.update(prisma, id, data);
  }

  static async delete(prisma, id) {
    // Verificar se existem orçamentos vinculados
    // Como o Service não tem acesso direto ao prisma, vamos usar o Repositório ou adicionar o count lá.
    // Mas para ser rápido e consistente, vou importar o repository e adicionar o método lá, ou importar prisma aqui.
    // O padrão aqui parece ser usar o Repository. Vou adicionar validação aqui chamando count no prisma se possível 
    // ou idealmente, adicionar 'countBudgets' no repository.
    // Mas como não vou editar o REPO agora se não precisar, vou tentar importar prisma.
    // Melhor: Adicionar `hasBudgets` no FiscalYearRepository.

    // Vou usar uma abordagem direta importando o prisma aqui para checar, igual User Service faz (embora User Service instancie novo Client, o que é ruim).
    // Vou fazer o require do config/database
    const budgetCount = await prisma.budget.count({ where: { fiscalYearId: id } });

    if (budgetCount > 0) {
      throw {
        statusCode: 400,
        message: 'Não é possível excluir este Ano Fiscal pois existem Orçamentos vinculados. Exclua os orçamentos primeiro.'
      };
    }

    return FiscalYearRepository.delete(prisma, id);
  }
}

module.exports = FiscalYearService;