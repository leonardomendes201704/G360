class BudgetScenarioRepository {
    static async create(prisma, data) {
        return prisma.budgetScenario.create({ data });
    }

    static async update(prisma, id, data) {
        return prisma.budgetScenario.update({ where: { id }, data });
    }

    static async delete(prisma, id) {
        return prisma.budgetScenario.delete({ where: { id } });
    }

    static async findById(prisma, id, include = {}) {
        return prisma.budgetScenario.findUnique({ where: { id }, include });
    }

    static async findByBudget(prisma, budgetId, include = {}) {
        return prisma.budgetScenario.findMany({
            where: { budgetId },
            orderBy: { createdAt: 'asc' },
            include
        });
    }

    // --- Scenario Items ---
    static async createItem(prisma, data) {
        return prisma.budgetScenarioItem.create({ data });
    }

    static async createManyItems(prisma, data) {
        return prisma.budgetScenarioItem.createMany({ data });
    }

    static async findItemsByScenario(prisma, scenarioId, include = {}) {
        return prisma.budgetScenarioItem.findMany({
            where: { scenarioId },
            include
        });
    }

    static async deleteItemsByScenario(prisma, scenarioId) {
        return prisma.budgetScenarioItem.deleteMany({ where: { scenarioId } });
    }

    static async updateSelectedScenario(prisma, budgetId, scenarioId) {
        // Deselect all, then select the one
        await prisma.budgetScenario.updateMany({
            where: { budgetId },
            data: { isSelected: false }
        });
        return prisma.budgetScenario.update({
            where: { id: scenarioId },
            data: { isSelected: true }
        });
    }
}

module.exports = BudgetScenarioRepository;
