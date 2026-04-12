import api from './api';

/**
 * Get list of budgets available for comparison
 */
export const getAvailableBudgets = async () => {
    const response = await api.get('/budget-comparison/available');
    return response.data;
};

/**
 * Compare two budgets
 * @param {string} budgetId1 - First budget ID
 * @param {string} budgetId2 - Second budget ID
 */
export const compareBudgets = async (budgetId1, budgetId2) => {
    const response = await api.post('/budget-comparison', { budgetId1, budgetId2 });
    return response.data;
};

/**
 * Compare multiple budgets (N budgets)
 * @param {string[]} budgetIds - Array of budget IDs
 */
export const compareMultipleBudgets = async (budgetIds) => {
    const response = await api.post('/budget-comparison/multi', { budgetIds });
    return response.data;
};

export default {
    getAvailableBudgets,
    compareBudgets,
    compareMultipleBudgets
};
