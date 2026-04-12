const BudgetRepository = require('../repositories/budget.repository');
const { userCanApproveBudget, notifyBudgetTierApprovers } = require('./approval-tier.service');
const FiscalYearRepository = require('../repositories/fiscal-year.repository');
const AccountRepository = require('../repositories/account.repository');
const CostCenterRepository = require('../repositories/cost-center.repository');
const SupplierRepository = require('../repositories/supplier.repository');
const AuditLogRepository = require('../repositories/audit-log.repository');
const { getUserAccessScope, getScopedCostCenterIds } = require('../utils/access-scope');
const logger = require('../config/logger');

class BudgetService {
  static async create(prisma, data) {
    const { createdBy, ...budgetData } = data;

    const fiscalYear = await FiscalYearRepository.findById(prisma, budgetData.fiscalYearId);
    if (!fiscalYear) throw { statusCode: 404, message: 'Ano Fiscal não encontrado.' };

    const budget = await BudgetRepository.create(prisma, { ...budgetData, status: 'DRAFT' }); // tenantId removed

    await AuditLogRepository.create(prisma, {
      userId: createdBy || 'system',
      action: 'criou orçamento',
      module: 'FINANCE',
      entityId: budget.id,
      entityType: 'BUDGET',
      newData: budget
    });

    return budget;
  }

  static async getAll(prisma, userId) {
    if (userId) {
      const scope = await getUserAccessScope(prisma, userId);
      // Admins see all budgets
      if (scope.isAdmin) return BudgetRepository.findAll(prisma, null);
      const costCenterIds = getScopedCostCenterIds(scope);
      return BudgetRepository.findAll(prisma, costCenterIds);
    }
    return BudgetRepository.findAll(prisma, null);
  }

  static async getById(prisma, id, userId) {
    const budget = await BudgetRepository.findById(prisma, id);
    if (!budget) throw { statusCode: 404, message: 'Orcamento nao encontrado.' };

    if (userId) {
      const scope = await getUserAccessScope(prisma, userId);
      if (scope.isAdmin === false) {
        // Allow access if budget has no items (newly created) OR if matches scope
        const isEmpty = !budget.items || budget.items.length === 0;

        if (!isEmpty) {
          const allowedCostCenters = getScopedCostCenterIds(scope);

          // Items without costCenterId are general (accessible to all authenticated users)
          const hasGeneralItems = budget.items.some(item => !item.costCenterId);
          const hasScopedAccess = allowedCostCenters && allowedCostCenters.length > 0
            ? budget.items.some(item => item.costCenterId && allowedCostCenters.includes(item.costCenterId))
            : false;

          // Allow access if user has scoped items OR budget has general items
          if (!hasScopedAccess && !hasGeneralItems) {
            throw { statusCode: 403, message: 'Acesso negado.' };
          }

          // Filter: show general items (no CC) + items matching user's scope
          const filteredItems = budget.items.filter(item =>
            !item.costCenterId || (allowedCostCenters && allowedCostCenters.includes(item.costCenterId))
          );
          return { ...budget, items: filteredItems };
        }
        // If empty, return as is (allow access to add items)
      }
    }

    return budget;
  }

  static async update(prisma, id, data) {
    await this.getById(prisma, id, data.userId);
    const oldData = await this.getById(prisma, id, data.userId);
    if (oldData.status === 'APPROVED') {
      throw { statusCode: 400, message: 'Não é possível alterar um orçamento APROVADO.' };
    }
    if (oldData.status === 'PENDING_APPROVAL') {
      throw { statusCode: 400, message: 'Orçamento aguardando aprovação: aguarde decisão ou cancele pela esteira.' };
    }

    // Sanitize input data
    const { userId, id: _id, items, scenarios, fiscalYear, createdAt, updatedAt, createdBy, ...rest } = data;
    const updatePayload = { ...rest };

    if (updatePayload.fiscalYearId) {
      updatePayload.fiscalYear = { connect: { id: updatePayload.fiscalYearId } };
      delete updatePayload.fiscalYearId;
    }

    const updated = await BudgetRepository.update(prisma, id, updatePayload);

    await AuditLogRepository.create(prisma, {
      userId: data.userId || 'system',
      action: 'atualizou orçamento',
      module: 'FINANCE',
      entityId: id,
      entityType: 'BUDGET',
      oldData,
      newData: updated
    });

    return updated;
  }

  static async delete(prisma, id, userId) {
    const budget = await this.getById(prisma, id, userId);
    if (budget.status === 'APPROVED') {
      throw { statusCode: 400, message: 'Não é possível excluir um orçamento APROVADO.' };
    }
    return BudgetRepository.delete(prisma, id);
  }

  static async submitForApproval(prisma, id, userId) {
    const budget = await this.getById(prisma, id, userId);
    if (budget.status !== 'DRAFT') {
      throw { statusCode: 400, message: 'Apenas orçamentos em rascunho podem ser enviados para aprovação.' };
    }
    await BudgetRepository.update(prisma, id, { status: 'PENDING_APPROVAL' });
    const full = await BudgetRepository.findById(prisma, id);
    try {
      await notifyBudgetTierApprovers(prisma, full, { alreadyNotifiedUserId: userId });
    } catch (e) {
      /* noop */
    }
    await AuditLogRepository.create(prisma, {
      userId,
      action: 'enviou orçamento para aprovação',
      module: 'FINANCE',
      entityId: id,
      entityType: 'BUDGET',
    });
    return full;
  }

  static async approve(prisma, id, userId) {
    await this.getById(prisma, id, userId);

    // Fetch full structure for generation
    const fullBudget = await BudgetRepository.findById(prisma, id);
    if (!fullBudget) throw { statusCode: 404, message: 'Orçamento não encontrado.' };

    if (fullBudget.status === 'APPROVED') {
      throw { statusCode: 400, message: 'Orçamento já está aprovado.' };
    }
    if (fullBudget.status !== 'DRAFT' && fullBudget.status !== 'PENDING_APPROVAL') {
      throw { statusCode: 400, message: 'Status do orçamento não permite aprovação.' };
    }

    if (!(await userCanApproveBudget(prisma, userId, fullBudget))) {
      throw { statusCode: 403, message: 'Sem permissão para aprovar este orçamento (configure alçadas em Organização ou use perfil autorizado).' };
    }

    const ExpenseRepository = require('../repositories/expense.repository'); // Import here to avoid circular dependency
    const FiscalYearRepository = require('../repositories/fiscal-year.repository');

    const fiscalYear = await FiscalYearRepository.findById(prisma, fullBudget.fiscalYearId);
    if (!fiscalYear) throw { statusCode: 400, message: 'Ano Fiscal inválido.' };

    const year = fiscalYear.year;
    const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

    // 1. Update Status
    await BudgetRepository.update(prisma, id, {
      status: 'APPROVED',
      approvedBy: userId,
      approvedAt: new Date()
    });

    // 2. Generate Expenses
    const transactions = [];

    for (const item of fullBudget.items) {
      for (let i = 0; i < months.length; i++) {
        const monthKey = months[i];
        const amount = Number(item[monthKey]);

        if (amount > 0) {
          // Construct Date: Year-Month-01
          // i=0 is Jan -> Month is 0 in JS Date? No, "2024-01-01"
          // Let's use string construction for safety or Date constructor
          const date = new Date(year, i, 1);

          const expenseData = {
            description: item.description || `Orçamento: ${item.account.name}`,
            amount: amount,
            date: date,
            type: item.type === 'OPERATIONAL' ? 'OPEX' : (item.type === 'CAPEX' ? 'CAPEX' : 'OPEX'), // Default to OPEX if mismatch
            status: 'PREVISTO',
            accountId: item.accountId,
            costCenterId: item.costCenterId,
            supplierId: item.supplierId,
            projectId: item.projectId,
            createdBy: userId, // System or Approver
            contractId: null // Budget items might not link directly to contracts yet
          };

          // Push promise to array
          transactions.push(ExpenseRepository.create(prisma, expenseData));
        }
      }
    }

    await Promise.all(transactions);

    await AuditLogRepository.create(prisma, {
      userId,
      action: 'aprovou orçamento',
      module: 'FINANCE',
      entityId: id,
      entityType: 'BUDGET',
      newData: { status: 'APPROVED', approvedBy: userId }
    });

    return { message: 'Orçamento aprovado e despesas geradas com sucesso.' };
  }

  static async duplicate(prisma, id, newName, userId) {
    const originalBudget = await BudgetRepository.findById(prisma, id);
    if (!originalBudget) throw { statusCode: 404, message: 'Orçamento original não encontrado.' };

    // 1. Create new Budget Header
    const budgetData = {
      name: newName,
      fiscalYearId: originalBudget.fiscalYearId,
      description: originalBudget.description ? `${originalBudget.description} (Cópia)` : 'Cópia duplicada',
      type: originalBudget.type,
      isOBZ: originalBudget.isOBZ,
      version: originalBudget.version, // Could increment logic if versioning is strict, but kept simple
      // createdBy removed as it is not in the schema, used for audit only
      status: 'DRAFT',
      totalOpex: 0,
      totalCapex: 0 // Will recirculate
    };

    const newBudget = await BudgetRepository.create(prisma, budgetData);

    // 2. Duplicate Items
    if (originalBudget.items && originalBudget.items.length > 0) {
      const newItems = originalBudget.items.map(item => ({
        budgetId: newBudget.id,
        accountId: item.accountId,
        costCenterId: item.costCenterId,
        supplierId: item.supplierId,
        projectId: item.projectId,
        description: item.description,
        type: item.type,
        jan: item.jan,
        feb: item.feb,
        mar: item.mar,
        apr: item.apr,
        may: item.may,
        jun: item.jun,
        jul: item.jul,
        aug: item.aug,
        sep: item.sep,
        oct: item.oct,
        nov: item.nov,
        dec: item.dec,
        total: item.total,
        // Resetting OBZ flags or keeping?
        // Usually a copy starts fresh or inherits. Let's inherit but reset progress.
        justification: item.justification,
        priority: item.priority,
        isNewExpense: true, // Assuming copy is treated as new input
        previousYearValue: item.previousYearValue,
        variancePercent: item.variancePercent
      }));

      await BudgetRepository.createManyItems(prisma, newItems);
      await BudgetRepository.calculateTotals(prisma, newBudget.id);
    }

    await AuditLogRepository.create(prisma, {
      userId,
      action: 'duplicou orçamento',
      module: 'FINANCE',
      entityId: newBudget.id,
      entityType: 'BUDGET',
      newData: { originalId: id, newId: newBudget.id }
    });

    return newBudget;
  }

  // --- ITENS ---

  static async addItem(prisma, budgetId, data, userId) {
    const budget = await this.getById(prisma, budgetId, userId);
    if (budget.status === 'APPROVED') {
      throw { statusCode: 400, message: 'Não é possível adicionar itens a um orçamento APROVADO.' };
    }
    if (budget.status === 'PENDING_APPROVAL') {
      throw { statusCode: 400, message: 'Orçamento na fila de aprovação: não é possível alterar itens.' };
    }

    const account = await AccountRepository.findById(prisma, data.accountId);
    if (!account) throw { statusCode: 404, message: 'Conta Contábil não encontrada.' };

    if (data.costCenterId) {
      const cc = await CostCenterRepository.findById(prisma, data.costCenterId);
      if (!cc) throw { statusCode: 404, message: 'Centro de Custo não encontrado.' };
    }

    // Scope check: non-admins MUST specify a cost center they have access to
    if (userId) {
      const scope = await getUserAccessScope(prisma, userId);
      if (scope.isAdmin === false) {
        if (!data.costCenterId) {
          throw { statusCode: 400, message: 'Centro de Custo é obrigatório. Selecione o centro de custo ao qual você pertence.' };
        }
        const allowedCostCenters = getScopedCostCenterIds(scope);
        if (!allowedCostCenters || !allowedCostCenters.includes(data.costCenterId)) {
          throw { statusCode: 403, message: 'Acesso negado. Você só pode lançar em centros de custo que gerencia ou pertence.' };
        }
      }
    }

    if (data.supplierId) {
      const sup = await SupplierRepository.findById(prisma, data.supplierId);
      if (!sup) throw { statusCode: 404, message: 'Fornecedor não encontrado.' };
    }

    const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    let lineTotal = 0;
    months.forEach(m => { if (data[m]) lineTotal += Number(data[m]); });

    // === OBZ: Buscar valor do ano anterior ===
    let previousYearValue = null;
    let variancePercent = null;

    try {
      const currentFiscalYear = await FiscalYearRepository.findById(prisma, budget.fiscalYearId);
      if (currentFiscalYear) {
        const previousFY = await prisma.fiscalYear.findFirst({
          where: { year: currentFiscalYear.year - 1 }
        });

        if (previousFY) {
          const previousBudget = await prisma.budget.findFirst({
            where: { fiscalYearId: previousFY.id },
            include: { items: true }
          });

          if (previousBudget) {
            // Buscar item similar (mesma conta + CC + fornecedor)
            const previousItem = previousBudget.items.find(i =>
              i.accountId === data.accountId &&
              i.costCenterId === data.costCenterId &&
              i.supplierId === data.supplierId
            );

            if (previousItem) {
              previousYearValue = Number(previousItem.total);
              if (previousYearValue > 0) {
                variancePercent = ((lineTotal - previousYearValue) / previousYearValue) * 100;
              }
            }
          }
        }
      }
    } catch (e) {
      logger.warn('Erro ao buscar valor do ano anterior:', e.message);
    }

    const item = await BudgetRepository.createItem(prisma, {
      ...data,
      budgetId,
      type: account.type,
      total: lineTotal,
      // Campos OBZ
      justification: data.justification || null,
      priority: data.priority || null,
      isNewExpense: previousYearValue === null,
      previousYearValue,
      variancePercent
    });

    await BudgetRepository.calculateTotals(prisma, budgetId);
    return item;
  }

  static async updateItem(prisma, itemId, data, userId) {
    const item = await BudgetRepository.findItemById(prisma, itemId);
    if (!item) throw { statusCode: 404, message: 'Item não encontrado.' };

    const parentBudget = await this.getById(prisma, item.budgetId, userId);
    if (parentBudget.status === 'APPROVED') {
      throw { statusCode: 400, message: 'Não é possível alterar itens de um orçamento APROVADO.' };
    }
    if (parentBudget.status === 'PENDING_APPROVAL') {
      throw { statusCode: 400, message: 'Orçamento na fila de aprovação: não é possível alterar itens.' };
    }

    const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    let lineTotal = 0;

    const mergedData = { ...item, ...data };

    months.forEach(m => {
      if (mergedData[m]) lineTotal += Number(mergedData[m]);
    });

    const {
      id,
      budgetId,
      createdAt,
      updatedAt,
      account,
      costCenter,
      supplier,
      project,
      budget,
      ...updatePayload
    } = data;

    const updated = await BudgetRepository.updateItem(prisma, itemId, { ...updatePayload, total: lineTotal });
    await BudgetRepository.calculateTotals(prisma, item.budgetId);

    return updated;
  }

  static async deleteItem(prisma, itemId, userId) {
    const item = await BudgetRepository.findItemById(prisma, itemId);
    if (!item) throw { statusCode: 404, message: 'Item não encontrado.' };

    const budget = await this.getById(prisma, item.budgetId, userId);
    if (budget.status === 'APPROVED') {
      throw { statusCode: 400, message: 'Não é possível excluir itens de um orçamento APROVADO.' };
    }
    if (budget.status === 'PENDING_APPROVAL') {
      throw { statusCode: 400, message: 'Orçamento na fila de aprovação: não é possível excluir itens.' };
    }

    await BudgetRepository.deleteItem(prisma, itemId);
    await BudgetRepository.calculateTotals(prisma, item.budgetId);
  }

  static async importItems(prisma, budgetId, fileBuffer, userId) {
    const xlsx = require('xlsx');

    const budget = await this.getById(prisma, budgetId, userId);
    if (budget.status === 'APPROVED') {
      throw { statusCode: 400, message: 'Não é possível importar itens em um orçamento APROVADO.' };
    }
    if (budget.status === 'PENDING_APPROVAL') {
      throw { statusCode: 400, message: 'Orçamento na fila de aprovação: não é possível importar.' };
    }

    // 1. Carregar e Validar Escopo de Acesso
    const scope = await getUserAccessScope(prisma, userId);
    const allowedCostCenterIds = getScopedCostCenterIds(scope); // null = Admin (tudo), Array = Restrito

    // 2. Ler Arquivo Excel
    const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rawRows = xlsx.utils.sheet_to_json(sheet);

    if (!rawRows || rawRows.length === 0) {
      throw { statusCode: 400, message: 'O arquivo Excel está vazio ou inválido.' };
    }

    // 3. Carregar Meta-dados para Validação (Otimização de Performance)
    const [allAccounts, allCostCenters] = await Promise.all([
      AccountRepository.findAll(prisma),
      CostCenterRepository.findAll(prisma)
    ]);

    const accountMap = new Map();
    allAccounts.forEach(a => accountMap.set(a.code.toString().trim(), a));

    const ccMap = new Map();
    allCostCenters.forEach(c => ccMap.set(c.code.toString().trim(), c));

    // Mapeamento de Meses (Flexibilidade no cabeçalho)
    const monthKeys = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const ptMonths = {
      'jan': 'janeiro', 'feb': 'fevereiro', 'mar': 'marco', 'apr': 'abril', 'may': 'maio', 'jun': 'junho',
      'jul': 'julho', 'aug': 'agosto', 'sep': 'setembro', 'oct': 'outubro', 'nov': 'novembro', 'dec': 'dezembro'
    };
    const ptShortMonths = {
      'jan': 'jan', 'feb': 'fev', 'mar': 'mar', 'apr': 'abr', 'may': 'mai', 'jun': 'jun',
      'jul': 'jul', 'aug': 'ago', 'sep': 'set', 'oct': 'out', 'nov': 'nov', 'dec': 'dez'
    };

    // 4. Processar e Validar cada linha
    const validItems = [];
    const errors = [];
    let rowIndex = 2; // Excel header é 1, dados começam na 2

    for (const row of rawRows) {
      // Normalizar chaves para lowercase e sem acentos
      const normRow = {};
      Object.keys(row).forEach(k => {
        const cleanKey = k.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        normRow[cleanKey] = row[k];
      });

      // Validar Conta
      const accountCode = (normRow['conta'] || normRow['conta contabil'] || normRow['codigo conta'])?.toString().trim();
      if (!accountCode) {
        errors.push(`Linha ${rowIndex}: Coluna 'Conta' não informada.`);
        rowIndex++; continue;
      }

      const account = accountMap.get(accountCode);
      if (!account) {
        errors.push(`Linha ${rowIndex}: Conta contábil '${accountCode}' não encontrada no sistema.`);
        rowIndex++; continue;
      }

      // Validar Centro de Custo
      let costCenterId = null;
      const ccCode = (normRow['centro de custo'] || normRow['cc'] || normRow['codigo cc'])?.toString().trim();

      if (ccCode) {
        const costCenter = ccMap.get(ccCode);
        if (!costCenter) {
          errors.push(`Linha ${rowIndex}: Centro de Custo '${ccCode}' não encontrado.`);
          rowIndex++; continue;
        }

        // SEGURANÇA: Verificar se usuário tem permissão para este CC
        if (allowedCostCenterIds !== null) {
          if (!allowedCostCenterIds.includes(costCenter.id)) {
            errors.push(`Linha ${rowIndex}: VOCÊ NÃO TEM PERMISSÃO para lançar no Centro de Custo '${ccCode}'.`);
            rowIndex++; continue;
          }
        }
        costCenterId = costCenter.id;
      } else {
        // Se a conta exige CC e não foi informado? (Opcional, mas recomendado validar)
        // Por hora, apenas permitimos null se vier null.
      }

      // Função auxiliar para parsear valores PT-BR
      const parseValue = (v) => {
        if (typeof v === 'number') return v;
        if (!v) return 0;
        if (typeof v === 'string') {
          // Remover R$ e espaços
          let clean = v.replace('R$', '').replace(/\s/g, '').trim();

          // Se for vazio
          if (!clean) return 0;

          // Formato Brasileiro: 1.000,00 ou 1000,00
          if (clean.includes(',')) {
            // Se tiver ponto (milhar) e virgula (decimal), remove ponto e troca virgula
            if (clean.includes('.')) {
              clean = clean.replace(/\./g, '');
            }
            clean = clean.replace(',', '.');
          }

          return parseFloat(clean) || 0;
        }
        return 0;
      };

      // Ler Valores Mensais
      const values = {};
      let total = 0;

      monthKeys.forEach(m => {
        const val =
          normRow[m] ??
          normRow[ptShortMonths[m]] ??
          normRow[ptMonths[m]] ??
          normRow[`${m}_valor`] ??
          0;

        values[m] = parseValue(val);
        total += values[m];
      });

      validItems.push({
        budgetId,
        accountId: account.id,
        costCenterId,
        description: normRow['descricao'] || normRow['historico'] || `Importação Excel: ${account.name}`,
        type: account.type, // CAPEX ou OPEX herdado da conta
        ...values,
        total,
        isNewExpense: true,
        priority: 'IMPORTANTE' // Default
      });

      rowIndex++;
    }

    // Se houve erros, rejeita TUDO com relatório
    if (errors.length > 0) {
      throw {
        statusCode: 400,
        message: 'Falha na validação do arquivo.',
        errors // Frontend deve exibir isso em lista
      };
    }

    // Se tudo OK, inserir
    if (validItems.length > 0) {
      await BudgetRepository.createManyItems(prisma, validItems);
      await BudgetRepository.calculateTotals(prisma, budgetId);
    }

    return { importedCount: validItems.length };
  }
}

module.exports = BudgetService;






