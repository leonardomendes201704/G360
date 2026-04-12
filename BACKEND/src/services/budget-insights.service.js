const BudgetService = require('./budget.service');

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

class BudgetInsightsService {

    /**
     * Análise completa de um orçamento
     */
    static async analyze(prisma, budgetId, userId) {
        const budget = await BudgetService.getById(budgetId, userId);
        if (!budget) {
            throw { statusCode: 404, message: 'Orcamento nao encontrado.' };
        }

        const year = budget.fiscalYear.year;
        const allowedCostCenterIds = [...new Set(budget.items.map(i => i.costCenterId).filter(Boolean))];

        // Buscar orcamento do ano anterior para comparacao
        const previousYearBudget = await this._getPreviousYearBudget(prisma, year, allowedCostCenterIds);

        return {
            summary: this._generateSummary(budget),
            yearOverYear: this._compareWithPreviousYear(budget, previousYearBudget),
            distribution: this._analyzeDistribution(budget),
            obzAnalysis: this._analyzeOBZ(budget),
            risks: this._identifyRisks(budget),
            recommendations: this._generateRecommendations(budget, previousYearBudget)
        };
    }

    /**
     * Buscar orçamento do ano anterior
     */
    static async _getPreviousYearBudget(prisma, currentYear, allowedCostCenterIds) {
        const previousFiscalYear = await prisma.fiscalYear.findFirst({
            where: { year: currentYear - 1 }
        });

        if (!previousFiscalYear) return null;

        const budget = await prisma.budget.findFirst({
            where: { fiscalYearId: previousFiscalYear.id, status: 'APPROVED' },
            include: {
                items: {
                    include: {
                        costCenter: true,
                        account: true
                    }
                }
            }
        });

        if (!budget) return null;
        if (!Array.isArray(allowedCostCenterIds) || allowedCostCenterIds.length === 0) return budget;

        return {
            ...budget,
            items: budget.items.filter(item => item.costCenterId && allowedCostCenterIds.includes(item.costCenterId))
        };
    }

    /**
     * Gerar resumo do orçamento
     */
    static _generateSummary(budget) {
        const totalOpex = Number(budget.totalOpex);
        const totalCapex = Number(budget.totalCapex);
        const total = totalOpex + totalCapex;

        const itemsCount = budget.items.length;
        const costCenters = new Set(budget.items.map(i => i.costCenterId).filter(Boolean));
        const accounts = new Set(budget.items.map(i => i.accountId));

        return {
            total,
            totalOpex,
            totalCapex,
            opexPercent: total > 0 ? (totalOpex / total) * 100 : 0,
            capexPercent: total > 0 ? (totalCapex / total) * 100 : 0,
            itemsCount,
            costCentersCount: costCenters.size,
            accountsCount: accounts.size,
            status: budget.status
        };
    }

    /**
     * Comparar com ano anterior (YoY)
     */
    static _compareWithPreviousYear(currentBudget, previousBudget) {
        if (!previousBudget) {
            return {
                available: false,
                message: 'Sem dados do ano anterior para comparação'
            };
        }

        const currentTotal = Number(currentBudget.totalOpex) + Number(currentBudget.totalCapex);
        const previousTotal = Number(previousBudget.totalOpex) + Number(previousBudget.totalCapex);

        const variance = currentTotal - previousTotal;
        const variancePercent = previousTotal > 0 ? (variance / previousTotal) * 100 : 0;

        // Comparar por conta contábil
        const accountComparison = {};

        currentBudget.items.forEach(item => {
            const accId = item.accountId;
            const accName = item.account?.name || 'Sem conta';
            if (!accountComparison[accId]) {
                accountComparison[accId] = { name: accName, current: 0, previous: 0 };
            }
            accountComparison[accId].current += Number(item.total);
        });

        previousBudget.items.forEach(item => {
            const accId = item.accountId;
            const accName = item.account?.name || 'Sem conta';
            if (!accountComparison[accId]) {
                accountComparison[accId] = { name: accName, current: 0, previous: 0 };
            }
            accountComparison[accId].previous += Number(item.total);
        });

        const comparisons = Object.entries(accountComparison).map(([id, data]) => ({
            accountId: id,
            name: data.name,
            current: data.current,
            previous: data.previous,
            variance: data.current - data.previous,
            variancePercent: data.previous > 0 ? ((data.current - data.previous) / data.previous) * 100 : (data.current > 0 ? 100 : 0)
        }));

        // Top aumentos e reduções
        const sorted = comparisons.sort((a, b) => b.variancePercent - a.variancePercent);
        const topIncreases = sorted.filter(c => c.variancePercent > 0).slice(0, 5);
        const topDecreases = sorted.filter(c => c.variancePercent < 0).slice(-5).reverse();

        return {
            available: true,
            currentTotal,
            previousTotal,
            variance,
            variancePercent,
            topIncreases,
            topDecreases
        };
    }

    /**
     * Analisar distribuição do orçamento
     */
    static _analyzeDistribution(budget) {
        // Por prioridade OBZ
        const byPriority = { ESSENCIAL: 0, IMPORTANTE: 0, DESEJAVEL: 0, SEM_CLASSIFICACAO: 0 };

        // Por Centro de Custo
        const byCostCenter = {};

        // Por Conta Contábil
        const byAccount = {};

        budget.items.forEach(item => {
            const value = Number(item.total);

            // Prioridade
            const priority = item.priority || 'SEM_CLASSIFICACAO';
            byPriority[priority] = (byPriority[priority] || 0) + value;

            // Centro de Custo
            const ccName = item.costCenter?.name || 'Sem CC';
            byCostCenter[ccName] = (byCostCenter[ccName] || 0) + value;

            // Conta
            const accName = item.account?.name || 'Sem Conta';
            byAccount[accName] = (byAccount[accName] || 0) + value;
        });

        const total = Object.values(byPriority).reduce((a, b) => a + b, 0);

        return {
            byPriority: Object.entries(byPriority).map(([name, value]) => ({
                name,
                value,
                percent: total > 0 ? (value / total) * 100 : 0
            })),
            byCostCenter: Object.entries(byCostCenter)
                .map(([name, value]) => ({ name, value, percent: total > 0 ? (value / total) * 100 : 0 }))
                .sort((a, b) => b.value - a.value)
                .slice(0, 10),
            byAccount: Object.entries(byAccount)
                .map(([name, value]) => ({ name, value, percent: total > 0 ? (value / total) * 100 : 0 }))
                .sort((a, b) => b.value - a.value)
                .slice(0, 10)
        };
    }

    /**
     * Analisar qualidade do preenchimento OBZ
     */
    static _analyzeOBZ(budget) {
        const total = budget.items.length;

        const withJustification = budget.items.filter(i => i.justification && i.justification.trim() !== '').length;
        const withPriority = budget.items.filter(i => i.priority).length;
        const newExpenses = budget.items.filter(i => i.isNewExpense === true).length;
        const historicalExpenses = budget.items.filter(i => i.isNewExpense === false).length;

        return {
            totalItems: total,
            withJustification,
            withoutJustification: total - withJustification,
            justificationRate: total > 0 ? (withJustification / total) * 100 : 0,
            withPriority,
            priorityRate: total > 0 ? (withPriority / total) * 100 : 0,
            newExpenses,
            historicalExpenses,
            obzCompliance: total > 0 ? ((withJustification + withPriority) / (total * 2)) * 100 : 0
        };
    }

    /**
     * Identificar riscos no orçamento
     */
    static _identifyRisks(budget) {
        const risks = [];
        const total = Number(budget.totalOpex) + Number(budget.totalCapex);

        // Concentração em um CC
        const byCostCenter = {};
        budget.items.forEach(item => {
            const ccName = item.costCenter?.name || 'Sem CC';
            byCostCenter[ccName] = (byCostCenter[ccName] || 0) + Number(item.total);
        });

        Object.entries(byCostCenter).forEach(([name, value]) => {
            const percent = total > 0 ? (value / total) * 100 : 0;
            if (percent > 30) {
                risks.push({
                    type: 'CONCENTRATION',
                    severity: percent > 50 ? 'HIGH' : 'MEDIUM',
                    message: `Centro de Custo "${name}" concentra ${percent.toFixed(1)}% do orçamento`,
                    entity: name,
                    value: percent
                });
            }
        });

        // Itens sem justificativa
        const withoutJustification = budget.items.filter(i => !i.justification || i.justification.trim() === '');
        if (withoutJustification.length > 0) {
            const valueWithout = withoutJustification.reduce((sum, i) => sum + Number(i.total), 0);
            risks.push({
                type: 'OBZ_INCOMPLETE',
                severity: 'MEDIUM',
                message: `${withoutJustification.length} itens sem justificativa OBZ (R$ ${valueWithout.toLocaleString('pt-BR')})`,
                value: withoutJustification.length
            });
        }

        // Itens com variação alta vs ano anterior
        const highVariance = budget.items.filter(i => {
            if (!i.previousYearValue || Number(i.previousYearValue) === 0) return false;
            const variance = Math.abs(Number(i.variancePercent) || 0);
            return variance > 50;
        });

        if (highVariance.length > 0) {
            risks.push({
                type: 'HIGH_VARIANCE',
                severity: 'MEDIUM',
                message: `${highVariance.length} itens com variação acima de 50% vs ano anterior`,
                value: highVariance.length
            });
        }

        return risks;
    }

    /**
     * Gerar recomendações automáticas
     */
    static _generateRecommendations(budget, previousBudget) {
        const recommendations = [];
        const obz = this._analyzeOBZ(budget);

        // Recomendação OBZ
        if (obz.justificationRate < 80) {
            recommendations.push({
                priority: 'HIGH',
                category: 'GOVERNANCE',
                title: 'Completar justificativas OBZ',
                description: `Apenas ${obz.justificationRate.toFixed(0)}% dos itens possuem justificativa. Para compliance OBZ, recomenda-se 100%.`,
                action: 'Revisar itens e adicionar justificativas faltantes'
            });
        }

        // Recomendação de classificação
        if (obz.priorityRate < 100) {
            recommendations.push({
                priority: 'MEDIUM',
                category: 'CLASSIFICATION',
                title: 'Classificar prioridades',
                description: `${(100 - obz.priorityRate).toFixed(0)}% dos itens não possuem prioridade (Essencial/Importante/Desejável).`,
                action: 'Atribuir prioridade para facilitar análise de cortes'
            });
        }

        // Recomendação de corte baseado em prioridade
        const distribution = this._analyzeDistribution(budget);
        const desejavelValue = distribution.byPriority.find(p => p.name === 'DESEJAVEL')?.value || 0;

        if (desejavelValue > 0) {
            recommendations.push({
                priority: 'LOW',
                category: 'OPTIMIZATION',
                title: 'Oportunidade de corte',
                description: `R$ ${desejavelValue.toLocaleString('pt-BR')} em itens classificados como "Desejável" podem ser revisados para possível redução.`,
                action: 'Criar cenário alternativo sem itens desejáveis'
            });
        }

        // Comparação YoY
        if (previousBudget) {
            const currentTotal = Number(budget.totalOpex) + Number(budget.totalCapex);
            const previousTotal = Number(previousBudget.totalOpex) + Number(previousBudget.totalCapex);
            const variancePercent = previousTotal > 0 ? ((currentTotal - previousTotal) / previousTotal) * 100 : 0;

            if (variancePercent > 15) {
                recommendations.push({
                    priority: 'HIGH',
                    category: 'VARIANCE',
                    title: 'Aumento significativo vs ano anterior',
                    description: `Orçamento ${variancePercent.toFixed(1)}% maior que o ano anterior. Isso pode exigir justificativa adicional.`,
                    action: 'Documentar razões para o aumento'
                });
            }
        }

        return recommendations.sort((a, b) => {
            const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
            return priorityOrder[a.priority] - priorityOrder[b.priority];
        });
    }
}

module.exports = BudgetInsightsService;


