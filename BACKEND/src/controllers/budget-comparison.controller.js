const logger = require('../config/logger');

class BudgetComparisonController {
    /**
     * Compare two budgets and return detailed analysis
     * POST /api/budgets/compare
     * Body: { budgetId1, budgetId2 }
     */
    static async compare(req, res) {
        try {
            const { budgetId1, budgetId2 } = req.body;

            if (!budgetId1 || !budgetId2) {
                return res.status(400).json({ message: 'Ambos os IDs de orçamento são obrigatórios' });
            }

            if (budgetId1 === budgetId2) {
                return res.status(400).json({ message: 'Selecione dois orçamentos diferentes para comparar' });
            }

            // Fetch both budgets with their items
            const [budget1, budget2] = await Promise.all([
                req.prisma.budget.findUnique({
                    where: { id: budgetId1 },
                    include: {
                        fiscalYear: true,
                        items: {
                            include: {
                                account: true,
                                supplier: true,
                                costCenter: true
                            }
                        }
                    }
                }),
                req.prisma.budget.findUnique({
                    where: { id: budgetId2 },
                    include: {
                        fiscalYear: true,
                        items: {
                            include: {
                                account: true,
                                supplier: true,
                                costCenter: true
                            }
                        }
                    }
                })
            ]);

            if (!budget1 || !budget2) {
                return res.status(404).json({ message: 'Um ou ambos os orçamentos não foram encontrados' });
            }

            // Calculate totals
            const budget1Total = Number(budget1.totalOpex) + Number(budget1.totalCapex);
            const budget2Total = Number(budget2.totalOpex) + Number(budget2.totalCapex);
            const totalDifference = budget2Total - budget1Total;
            const percentChange = budget1Total > 0 ? ((totalDifference / budget1Total) * 100) : 0;

            // Create matching key for items (Account + Supplier)
            const createMatchKey = (item) => {
                const accountId = item.accountId || 'no-account';
                const supplierId = item.supplierId || 'no-supplier';
                return `${accountId}::${supplierId}`;
            };

            // Group items by match key
            const budget1ItemsMap = new Map();
            const budget2ItemsMap = new Map();

            budget1.items.forEach(item => {
                const key = createMatchKey(item);
                if (!budget1ItemsMap.has(key)) {
                    budget1ItemsMap.set(key, []);
                }
                budget1ItemsMap.get(key).push(item);
            });

            budget2.items.forEach(item => {
                const key = createMatchKey(item);
                if (!budget2ItemsMap.has(key)) {
                    budget2ItemsMap.set(key, []);
                }
                budget2ItemsMap.get(key).push(item);
            });

            // Get all unique keys
            const allKeys = new Set([...budget1ItemsMap.keys(), ...budget2ItemsMap.keys()]);

            // Analyze items
            let itemsAdded = 0;
            let itemsRemoved = 0;
            let itemsChanged = 0;
            const detailedItems = [];
            const variations = [];

            allKeys.forEach(key => {
                const items1 = budget1ItemsMap.get(key) || [];
                const items2 = budget2ItemsMap.get(key) || [];

                const total1 = items1.reduce((sum, item) => sum + Number(item.total || 0), 0);
                const total2 = items2.reduce((sum, item) => sum + Number(item.total || 0), 0);
                const diff = total2 - total1;

                // Get representative item for display
                const repItem = items2[0] || items1[0];

                let status;
                if (items1.length === 0) {
                    status = 'ADDED';
                    itemsAdded += items2.length;
                } else if (items2.length === 0) {
                    status = 'REMOVED';
                    itemsRemoved += items1.length;
                } else if (Math.abs(diff) > 0.01) {
                    status = diff > 0 ? 'INCREASED' : 'DECREASED';
                    itemsChanged++;
                } else {
                    status = 'UNCHANGED';
                }

                detailedItems.push({
                    matchKey: key,
                    accountName: repItem.account?.name || 'Sem conta',
                    accountCode: repItem.account?.code || '',
                    supplierName: repItem.supplier?.name || 'Sem fornecedor',
                    description: repItem.description || '',
                    budget1Value: total1,
                    budget2Value: total2,
                    difference: diff,
                    percentChange: total1 > 0 ? ((diff / total1) * 100) : (total2 > 0 ? 100 : 0),
                    status,
                    priority: repItem.priority || null
                });

                // Add to variations if significant change
                if (status !== 'UNCHANGED') {
                    variations.push({
                        type: status,
                        accountName: repItem.account?.name || 'Sem conta',
                        accountCode: repItem.account?.code || '',
                        supplierName: repItem.supplier?.name || 'Sem fornecedor',
                        description: repItem.description || '',
                        budget1Value: total1,
                        budget2Value: total2,
                        difference: diff,
                        percentChange: total1 > 0 ? ((diff / total1) * 100) : (total2 > 0 ? 100 : 0),
                        priority: repItem.priority || null
                    });
                }
            });

            // Sort variations by absolute difference (top impacts)
            variations.sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference));

            // Group by Account
            const accountTotals = new Map();
            detailedItems.forEach(item => {
                const key = item.accountCode || 'no-account';
                if (!accountTotals.has(key)) {
                    accountTotals.set(key, {
                        accountId: key,
                        accountName: item.accountName,
                        accountCode: item.accountCode,
                        budget1Total: 0,
                        budget2Total: 0
                    });
                }
                const acc = accountTotals.get(key);
                acc.budget1Total += item.budget1Value;
                acc.budget2Total += item.budget2Value;
            });

            const byAccount = Array.from(accountTotals.values()).map(acc => ({
                ...acc,
                difference: acc.budget2Total - acc.budget1Total,
                percentChange: acc.budget1Total > 0 ? (((acc.budget2Total - acc.budget1Total) / acc.budget1Total) * 100) : 0
            })).sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference));

            // Group by Supplier
            const supplierTotals = new Map();
            detailedItems.forEach(item => {
                const key = item.supplierName || 'Sem fornecedor';
                if (!supplierTotals.has(key)) {
                    supplierTotals.set(key, {
                        supplierName: key,
                        budget1Total: 0,
                        budget2Total: 0
                    });
                }
                const sup = supplierTotals.get(key);
                sup.budget1Total += item.budget1Value;
                sup.budget2Total += item.budget2Value;
            });

            const bySupplier = Array.from(supplierTotals.values()).map(sup => ({
                ...sup,
                difference: sup.budget2Total - sup.budget1Total,
                percentChange: sup.budget1Total > 0 ? (((sup.budget2Total - sup.budget1Total) / sup.budget1Total) * 100) : 0
            })).sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference));

            // Group by Priority (OBZ)
            const priorityTotals = new Map();
            const priorities = ['ESSENCIAL', 'IMPORTANTE', 'DESEJAVEL'];
            priorities.forEach(p => {
                priorityTotals.set(p, { priority: p, budget1Total: 0, budget2Total: 0 });
            });
            priorityTotals.set('SEM_PRIORIDADE', { priority: 'SEM_PRIORIDADE', budget1Total: 0, budget2Total: 0 });

            // Sum from original items
            budget1.items.forEach(item => {
                const key = item.priority || 'SEM_PRIORIDADE';
                if (priorityTotals.has(key)) {
                    priorityTotals.get(key).budget1Total += Number(item.total || 0);
                }
            });

            budget2.items.forEach(item => {
                const key = item.priority || 'SEM_PRIORIDADE';
                if (priorityTotals.has(key)) {
                    priorityTotals.get(key).budget2Total += Number(item.total || 0);
                }
            });

            const byPriority = Array.from(priorityTotals.values()).map(p => ({
                ...p,
                difference: p.budget2Total - p.budget1Total,
                percentChange: p.budget1Total > 0 ? (((p.budget2Total - p.budget1Total) / p.budget1Total) * 100) : 0
            }));

            // Only include priority analysis if at least one budget is OBZ
            const includesPriority = budget1.isOBZ || budget2.isOBZ;

            return res.json({
                budget1: {
                    id: budget1.id,
                    name: budget1.name,
                    fiscalYear: budget1.fiscalYear.year,
                    isOBZ: budget1.isOBZ,
                    totalOpex: Number(budget1.totalOpex),
                    totalCapex: Number(budget1.totalCapex),
                    total: budget1Total,
                    itemCount: budget1.items.length
                },
                budget2: {
                    id: budget2.id,
                    name: budget2.name,
                    fiscalYear: budget2.fiscalYear.year,
                    isOBZ: budget2.isOBZ,
                    totalOpex: Number(budget2.totalOpex),
                    totalCapex: Number(budget2.totalCapex),
                    total: budget2Total,
                    itemCount: budget2.items.length
                },
                summary: {
                    totalDifference,
                    percentChange,
                    itemsAdded,
                    itemsRemoved,
                    itemsChanged
                },
                byAccount,
                bySupplier,
                byPriority: includesPriority ? byPriority : null,
                variations: variations.slice(0, 15), // Top 15 impacts
                detailedItems
            });

        } catch (error) {
            logger.error('Erro ao comparar orçamentos:', error);
            return res.status(500).json({ message: 'Erro ao comparar orçamentos', error: error.message });
        }
    }

    /**
     * Compare multiple budgets (N budgets)
     * POST /api/budget-comparison/multi
     * Body: { budgetIds: string[] }
     */
    static async compareMultiple(req, res) {
        try {
            const { budgetIds } = req.body;

            if (!budgetIds || !Array.isArray(budgetIds) || budgetIds.length < 2) {
                return res.status(400).json({ message: 'É necessário informar pelo menos 2 orçamentos para comparar' });
            }

            // Remove duplicates
            const uniqueIds = [...new Set(budgetIds)];

            if (uniqueIds.length < 2) {
                return res.status(400).json({ message: 'É necessário informar pelo menos 2 orçamentos diferentes' });
            }

            // Fetch all budgets
            const budgets = await req.prisma.budget.findMany({
                where: { id: { in: uniqueIds } },
                include: {
                    fiscalYear: true,
                    items: {
                        include: {
                            account: true,
                            supplier: true,
                            costCenter: true
                        }
                    }
                }
            });

            if (budgets.length < 2) {
                return res.status(404).json({ message: 'É necessário pelo menos 2 orçamentos válidos' });
            }

            // Sort budgets by the order they were requested
            const orderedBudgets = uniqueIds
                .map(id => budgets.find(b => b.id === id))
                .filter(Boolean);

            // Create matching key for items (Account + Supplier)
            const createMatchKey = (item) => {
                const accountId = item.accountId || 'no-account';
                const supplierId = item.supplierId || 'no-supplier';
                return `${accountId}::${supplierId}`;
            };

            // Build budgets summary
            const budgetsSummary = orderedBudgets.map(b => ({
                id: b.id,
                name: b.name,
                fiscalYear: b.fiscalYear.year,
                isOBZ: b.isOBZ,
                totalOpex: Number(b.totalOpex),
                totalCapex: Number(b.totalCapex),
                total: Number(b.totalOpex) + Number(b.totalCapex),
                itemCount: b.items.length
            }));

            // Collect all unique account codes
            const allAccounts = new Map();
            orderedBudgets.forEach(budget => {
                budget.items.forEach(item => {
                    if (item.account && !allAccounts.has(item.account.code)) {
                        allAccounts.set(item.account.code, {
                            code: item.account.code,
                            name: item.account.name,
                            type: item.account.type
                        });
                    }
                });
            });

            // Build comparison by account
            const byAccount = [];
            allAccounts.forEach((account, code) => {
                const row = {
                    accountCode: code,
                    accountName: account.name,
                    accountType: account.type,
                    values: []
                };

                orderedBudgets.forEach(budget => {
                    const total = budget.items
                        .filter(item => item.account?.code === code)
                        .reduce((sum, item) => sum + Number(item.total || 0), 0);
                    row.values.push(total);
                });

                byAccount.push(row);
            });

            // Sort by first budget's value descending
            byAccount.sort((a, b) => (b.values[0] || 0) - (a.values[0] || 0));

            // Collect all unique suppliers
            const allSuppliers = new Map();
            orderedBudgets.forEach(budget => {
                budget.items.forEach(item => {
                    const supplierName = item.supplier?.name || 'Sem fornecedor';
                    if (!allSuppliers.has(supplierName)) {
                        allSuppliers.set(supplierName, supplierName);
                    }
                });
            });

            // Build comparison by supplier
            const bySupplier = [];
            allSuppliers.forEach((name) => {
                const row = {
                    supplierName: name,
                    values: []
                };

                orderedBudgets.forEach(budget => {
                    const total = budget.items
                        .filter(item => (item.supplier?.name || 'Sem fornecedor') === name)
                        .reduce((sum, item) => sum + Number(item.total || 0), 0);
                    row.values.push(total);
                });

                bySupplier.push(row);
            });

            // Sort by first budget's value descending
            bySupplier.sort((a, b) => (b.values[0] || 0) - (a.values[0] || 0));

            // Build comparison by priority (if any budget is OBZ)
            const hasOBZ = orderedBudgets.some(b => b.isOBZ);
            let byPriority = null;

            if (hasOBZ) {
                const priorities = ['ESSENCIAL', 'IMPORTANTE', 'DESEJAVEL', 'SEM_PRIORIDADE'];
                byPriority = priorities.map(priority => {
                    const row = {
                        priority,
                        values: []
                    };

                    orderedBudgets.forEach(budget => {
                        const total = budget.items
                            .filter(item => (item.priority || 'SEM_PRIORIDADE') === priority)
                            .reduce((sum, item) => sum + Number(item.total || 0), 0);
                        row.values.push(total);
                    });

                    return row;
                });
            }

            return res.json({
                budgets: budgetsSummary,
                byAccount,
                bySupplier,
                byPriority
            });

        } catch (error) {
            logger.error('Erro ao comparar múltiplos orçamentos:', error);
            return res.status(500).json({ message: 'Erro ao comparar orçamentos', error: error.message });
        }
    }

    /**
     * Get list of budgets available for comparison
     * GET /api/budgets/compare/available
     */
    static async getAvailableForComparison(req, res) {
        try {
            const budgets = await req.prisma.budget.findMany({
                include: {
                    fiscalYear: true,
                    _count: {
                        select: { items: true }
                    }
                },
                orderBy: [
                    { fiscalYear: { year: 'desc' } },
                    { name: 'asc' }
                ]
            });

            const result = budgets.map(b => ({
                id: b.id,
                name: b.name,
                fiscalYear: b.fiscalYear.year,
                isOBZ: b.isOBZ,
                status: b.status,
                totalOpex: Number(b.totalOpex),
                totalCapex: Number(b.totalCapex),
                total: Number(b.totalOpex) + Number(b.totalCapex),
                itemCount: b._count.items
            }));

            return res.json(result);

        } catch (error) {
            logger.error('Erro ao buscar orçamentos:', error);
            return res.status(500).json({ message: 'Erro ao buscar orçamentos', error: error.message });
        }
    }
}

module.exports = BudgetComparisonController;
