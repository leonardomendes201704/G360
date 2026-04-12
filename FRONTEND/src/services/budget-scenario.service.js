import api from './api';

// === CENÁRIOS ===

export const getScenariosByBudget = async (budgetId) => {
    const response = await api.get(`/finance/budgets/${budgetId}/scenarios`);
    return response.data;
};

export const createScenarioFromMultiplier = async (budgetId, name, multiplier, description = null) => {
    const response = await api.post(`/finance/budgets/${budgetId}/scenarios/multiplier`, {
        name,
        multiplier,
        description
    });
    return response.data;
};

export const createCustomScenario = async (budgetId, name, items, description = null) => {
    const response = await api.post(`/finance/budgets/${budgetId}/scenarios/custom`, {
        name,
        items,
        description
    });
    return response.data;
};

export const compareScenarios = async (scenarioId1, scenarioId2) => {
    const response = await api.get(`/finance/scenarios/compare`, {
        params: { scenarioId1, scenarioId2 }
    });
    return response.data;
};

export const getScenarioImpact = async (scenarioId) => {
    const response = await api.get(`/finance/scenarios/${scenarioId}/impact`);
    return response.data;
};

export const selectScenario = async (scenarioId) => {
    const response = await api.post(`/finance/scenarios/${scenarioId}/select`);
    return response.data;
};

export const deleteScenario = async (scenarioId) => {
    const response = await api.delete(`/finance/scenarios/${scenarioId}`);
    return response.data;
};

// === INSIGHTS ===

export const getBudgetInsights = async (budgetId) => {
    const response = await api.get(`/finance/budgets/${budgetId}/insights`);
    return response.data;
};

export default {
    getScenariosByBudget,
    createScenarioFromMultiplier,
    createCustomScenario,
    compareScenarios,
    getScenarioImpact,
    selectScenario,
    deleteScenario,
    getBudgetInsights
};
