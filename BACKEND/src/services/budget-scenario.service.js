const BudgetScenarioRepository = require('../repositories/budget-scenario.repository');
const BudgetService = require('./budget.service');

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

class BudgetScenarioService {

    /**
     * Criar cenario a partir de um multiplicador global
     * Ex: multiplier = 0.9 significa 10% de corte em todos os itens
     */
    static async createFromMultiplier(prisma, budgetId, name, multiplier, description = null, userId) {
        const budget = await BudgetService.getById(budgetId, userId);

        if (!budget) {
            throw { statusCode: 404, message: 'Orcamento nao encontrado.' };
        }

        // Calcular totais do cenario
        let totalOpex = 0;
        let totalCapex = 0;

        const scenarioItems = budget.items.map(item => {
            const scenarioItem = { originalItemId: item.id };
            let itemTotal = 0;

            MONTHS.forEach(month => {
                const originalValue = Number(item[month] || 0);
                const adjustedValue = originalValue * Number(multiplier);
                scenarioItem[month] = adjustedValue;
                itemTotal += adjustedValue;
            });

            scenarioItem.total = itemTotal;

            if (item.type === 'CAPEX') {
                totalCapex += itemTotal;
            } else {
                totalOpex += itemTotal;
            }

            return scenarioItem;
        });

        // Criar cenario com itens
        const scenario = await prisma.budgetScenario.create({
            data: {
                budgetId,
                name,
                description,
                multiplier: Number(multiplier),
                totalOpex,
                totalCapex,
                items: {
                    create: scenarioItems
                }
            },
            include: { items: true }
        });

        // Gerar analise de impacto
        const impactAnalysis = await this.generateImpactAnalysis(prisma, scenario.id, userId);
        await prisma.budgetScenario.update({
            where: { id: scenario.id },
            data: { impactAnalysis: JSON.stringify(impactAnalysis) }
        });

        return { ...scenario, impactAnalysis };
    }

    /**
     * Criar cenario customizado (item a item)
     */
    static async createCustom(prisma, budgetId, name, items, description = null, userId) {
        const budget = await BudgetService.getById(budgetId, userId);
        if (!budget) {
            throw { statusCode: 404, message: 'Orcamento nao encontrado.' };
        }

        let totalOpex = 0;
        let totalCapex = 0;

        const scenarioItems = items.map(item => {
            let itemTotal = 0;
            MONTHS.forEach(month => {
                itemTotal += Number(item[month] || 0);
            });

            if (item.type === 'CAPEX') {
                totalCapex += itemTotal;
            } else {
                totalOpex += itemTotal;
            }

            return {
                originalItemId: item.originalItemId,
                jan: Number(item.jan || 0),
                feb: Number(item.feb || 0),
                mar: Number(item.mar || 0),
                apr: Number(item.apr || 0),
                may: Number(item.may || 0),
                jun: Number(item.jun || 0),
                jul: Number(item.jul || 0),
                aug: Number(item.aug || 0),
                sep: Number(item.sep || 0),
                oct: Number(item.oct || 0),
                nov: Number(item.nov || 0),
                dec: Number(item.dec || 0),
                total: itemTotal,
                adjustmentNotes: item.adjustmentNotes || null
            };
        });

        const scenario = await prisma.budgetScenario.create({
            data: {
                budgetId,
                name,
                description,
                multiplier: 1.0, // Custom nao usa multiplicador
                totalOpex,
                totalCapex,
                items: { create: scenarioItems }
            },
            include: { items: true }
        });

        return scenario;
    }

    /**
     * Comparar dois cenarios com detalhamento por conta/fornecedor
     */
    static async compare(prisma, scenarioId1, scenarioId2, userId) {
        const [scenario1, scenario2] = await Promise.all([
            prisma.budgetScenario.findUnique({
                where: { id: scenarioId1 },
                include: {
                    items: true,
                    budget: {
                        include: {
                            items: {
                                include: { account: true, costCenter: true, supplier: true }
                            }
                        }
                    }
                }
            }),
            prisma.budgetScenario.findUnique({
                where: { id: scenarioId2 },
                include: {
                    items: true,
                    budget: {
                        include: {
                            items: {
                                include: { account: true, costCenter: true, supplier: true }
                            }
                        }
                    }
                }
            })
        ]);

        if (!scenario1 || !scenario2) {
            throw { statusCode: 404, message: 'Um ou mais cenarios nao encontrados.' };
        }

        const budget1 = await BudgetService.getById(scenario1.budgetId, userId);
        const budget2 = await BudgetService.getById(scenario2.budgetId, userId);

        const budget1Items = budget1.items || [];
        const budget2Items = budget2.items || [];

        // Map original items for lookup
        const originalItemsMap = {};
        budget1Items.forEach(item => {
            originalItemsMap[item.id] = item;
        });

        // Build detailed comparison by item
        const itemsComparison = [];
        const allOriginalItemIds = new Set([
            ...scenario1.items.map(i => i.originalItemId),
            ...scenario2.items.map(i => i.originalItemId)
        ]);

        allOriginalItemIds.forEach(originalItemId => {
            const original = originalItemsMap[originalItemId];
            if (!original) return;

            const s1Item = scenario1.items.find(i => i.originalItemId === originalItemId);
            const s2Item = scenario2.items.find(i => i.originalItemId === originalItemId);

            const s1Total = s1Item ? Number(s1Item.total) : 0;
            const s2Total = s2Item ? Number(s2Item.total) : 0;
            const diff = s2Total - s1Total;

            itemsComparison.push({
                originalItemId,
                account: original.account ? { id: original.accountId, name: original.account.name, code: original.account.code } : null,
                costCenter: original.costCenter ? { id: original.costCenterId, name: original.costCenter.name, code: original.costCenter.code } : null,
                supplier: original.supplier ? { id: original.supplierId, name: original.supplier.name } : null,
                description: original.description,
                scenario1Value: s1Total,
                scenario2Value: s2Total,
                difference: diff,
                percentChange: s1Total > 0 ? ((s2Total - s1Total) / s1Total) * 100 : (s2Total > 0 ? 100 : 0),
                inScenario1: !!s1Item,
                inScenario2: !!s2Item
            });
        });

        // Sort by absolute difference
        itemsComparison.sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference));

        // Group by account for summary
        const byAccount = {};
        itemsComparison.forEach(item => {
            if (item.account) {
                const key = item.account.id;
                if (!byAccount[key]) {
                    byAccount[key] = { ...item.account, scenario1Total: 0, scenario2Total: 0 };
                }
                byAccount[key].scenario1Total += item.scenario1Value;
                byAccount[key].scenario2Total += item.scenario2Value;
            }
        });

        // Group by supplier for summary
        const bySupplier = {};
        itemsComparison.forEach(item => {
            if (item.supplier) {
                const key = item.supplier.id;
                if (!bySupplier[key]) {
                    bySupplier[key] = { ...item.supplier, scenario1Total: 0, scenario2Total: 0 };
                }
                bySupplier[key].scenario1Total += item.scenario1Value;
                bySupplier[key].scenario2Total += item.scenario2Value;
            }
        });

        const comparison = {
            scenario1: {
                id: scenario1.id,
                name: scenario1.name,
                totalOpex: Number(scenario1.totalOpex),
                totalCapex: Number(scenario1.totalCapex),
                total: Number(scenario1.totalOpex) + Number(scenario1.totalCapex)
            },
            scenario2: {
                id: scenario2.id,
                name: scenario2.name,
                totalOpex: Number(scenario2.totalOpex),
                totalCapex: Number(scenario2.totalCapex),
                total: Number(scenario2.totalOpex) + Number(scenario2.totalCapex)
            },
            difference: {
                opex: Number(scenario2.totalOpex) - Number(scenario1.totalOpex),
                capex: Number(scenario2.totalCapex) - Number(scenario1.totalCapex),
                total: (Number(scenario2.totalOpex) + Number(scenario2.totalCapex)) -
                    (Number(scenario1.totalOpex) + Number(scenario1.totalCapex))
            },
            percentChange: {
                opex: scenario1.totalOpex > 0
                    ? ((Number(scenario2.totalOpex) - Number(scenario1.totalOpex)) / Number(scenario1.totalOpex)) * 100
                    : 0,
                capex: scenario1.totalCapex > 0
                    ? ((Number(scenario2.totalCapex) - Number(scenario1.totalCapex)) / Number(scenario1.totalCapex)) * 100
                    : 0
            },
            // NEW: Detailed breakdowns
            items: itemsComparison,
            byAccount: Object.values(byAccount).map(a => ({
                ...a,
                difference: a.scenario2Total - a.scenario1Total,
                percentChange: a.scenario1Total > 0 ? ((a.scenario2Total - a.scenario1Total) / a.scenario1Total) * 100 : 0
            })).sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference)),
            bySupplier: Object.values(bySupplier).map(s => ({
                ...s,
                difference: s.scenario2Total - s.scenario1Total,
                percentChange: s.scenario1Total > 0 ? ((s.scenario2Total - s.scenario1Total) / s.scenario1Total) * 100 : 0
            })).sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference))
        };

        return comparison;
    }

    /**
     * Gerar analise de impacto automatica
     */
    static async generateImpactAnalysis(prisma, scenarioId, userId) {
        const scenario = await prisma.budgetScenario.findUnique({
            where: { id: scenarioId },
            include: {
                items: true,
                budget: {
                    include: {
                        items: {
                            include: {
                                costCenter: true,
                                account: true
                            }
                        }
                    }
                }
            }
        });

        if (!scenario) {
            throw { statusCode: 404, message: 'Cenario nao encontrado.' };
        }

        const budget = await BudgetService.getById(scenario.budgetId, userId);
        const budgetItems = budget.items || [];

        const originalTotal = budgetItems.reduce((sum, item) => sum + Number(item.total), 0);
        const scenarioTotal = Number(scenario.totalOpex) + Number(scenario.totalCapex);
        const savingsOrExcess = originalTotal - scenarioTotal;

        // Agrupar impacto por Centro de Custo
        const impactByCC = {};
        scenario.items.forEach(scenarioItem => {
            const originalItem = budgetItems.find(i => i.id === scenarioItem.originalItemId);
            if (originalItem && originalItem.costCenter) {
                const ccName = originalItem.costCenter.name;
                if (!impactByCC[ccName]) {
                    impactByCC[ccName] = { original: 0, adjusted: 0 };
                }
                impactByCC[ccName].original += Number(originalItem.total);
                impactByCC[ccName].adjusted += Number(scenarioItem.total);
            }
        });

        const ccImpacts = Object.entries(impactByCC).map(([name, values]) => ({
            name,
            original: values.original,
            adjusted: values.adjusted,
            impact: values.original - values.adjusted,
            percentChange: values.original > 0 ? ((values.adjusted - values.original) / values.original) * 100 : 0
        })).sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));

        return {
            summary: {
                originalTotal,
                scenarioTotal,
                savingsOrExcess,
                percentChange: originalTotal > 0 ? ((scenarioTotal - originalTotal) / originalTotal) * 100 : 0
            },
            byCenter: ccImpacts,
            recommendations: this._generateRecommendations(savingsOrExcess, ccImpacts)
        };
    }

    /**
     * Gerar recomendacoes baseadas na analise
     */
    static _generateRecommendations(savingsOrExcess, ccImpacts) {
        const recommendations = [];

        if (savingsOrExcess > 0) {
            recommendations.push({
                type: 'SAVINGS',
                message: `Este cenario gera economia de R$ ${savingsOrExcess.toLocaleString('pt-BR')}`
            });
        } else if (savingsOrExcess < 0) {
            recommendations.push({
                type: 'EXCESS',
                message: `Este cenario aumenta o orcamento em R$ ${Math.abs(savingsOrExcess).toLocaleString('pt-BR')}`
            });
        }

        // CCs mais impactados
        const mostImpacted = ccImpacts.filter(cc => Math.abs(cc.percentChange) > 20);
        if (mostImpacted.length > 0) {
            recommendations.push({
                type: 'HIGH_IMPACT',
                message: `${mostImpacted.length} centro(s) de custo com variacao acima de 20%`,
                details: mostImpacted.map(cc => cc.name)
            });
        }

        return recommendations;
    }

    /**
     * Selecionar cenario como o escolhido
     */
    static async selectScenario(prisma, scenarioId, userId) {
        const scenario = await prisma.budgetScenario.findUnique({
            where: { id: scenarioId },
            include: { budget: true }
        });

        if (!scenario) {
            throw { statusCode: 404, message: 'Cenario nao encontrado.' };
        }

        await BudgetService.getById(scenario.budgetId, userId);

        // Desmarcar todos os outros cenarios do mesmo budget
        await prisma.budgetScenario.updateMany({
            where: { budgetId: scenario.budgetId },
            data: { isSelected: false }
        });

        // Marcar este como selecionado
        const updated = await prisma.budgetScenario.update({
            where: { id: scenarioId },
            data: { isSelected: true }
        });

        return updated;
    }

    /**
     * Listar cenarios de um orcamento
     */
    static async getByBudgetId(prisma, budgetId, userId) {
        await BudgetService.getById(budgetId, userId);
        return prisma.budgetScenario.findMany({
            where: { budgetId },
            include: { items: true },
            orderBy: { createdAt: 'desc' }
        });
    }

    /**
     * Deletar cenario
     */
    static async delete(prisma, scenarioId, userId) {
        const scenario = await prisma.budgetScenario.findUnique({ where: { id: scenarioId } });
        if (!scenario) throw { statusCode: 404, message: 'Cenario nao encontrado.' };
        await BudgetService.getById(scenario.budgetId, userId);
        return prisma.budgetScenario.delete({
            where: { id: scenarioId }
        });
    }
}

module.exports = BudgetScenarioService;
