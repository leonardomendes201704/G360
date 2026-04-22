const { tierAppliesToExpensePlan } = require('../../src/services/approval-tier.service');

describe('tierAppliesToExpensePlan (DES-03)', () => {
  const expensePlanned = { approvalStatus: 'PLANNED' };
  const expenseUnplanned = { approvalStatus: 'UNPLANNED' };
  const expenseNullScope = { approvalStatus: null };

  it('non-EXPENSE tiers always apply', () => {
    const tier = { entityType: 'BUDGET', expensePlanScope: 'UNPLANNED' };
    expect(tierAppliesToExpensePlan(tier, expensePlanned)).toBe(true);
  });

  it('EXPENSE + ALL or null scope applies to any expense', () => {
    expect(tierAppliesToExpensePlan({ entityType: 'EXPENSE', expensePlanScope: null }, expenseUnplanned)).toBe(true);
    expect(tierAppliesToExpensePlan({ entityType: 'EXPENSE', expensePlanScope: 'ALL' }, expensePlanned)).toBe(true);
  });

  it('EXPENSE + UNPLANNED scope only matches UNPLANNED expenses', () => {
    const tier = { entityType: 'EXPENSE', expensePlanScope: 'UNPLANNED' };
    expect(tierAppliesToExpensePlan(tier, expenseUnplanned)).toBe(true);
    expect(tierAppliesToExpensePlan(tier, expensePlanned)).toBe(false);
    expect(tierAppliesToExpensePlan(tier, expenseNullScope)).toBe(false);
  });

  it('EXPENSE + PLANNED scope only matches planned or null approvalStatus', () => {
    const tier = { entityType: 'EXPENSE', expensePlanScope: 'PLANNED' };
    expect(tierAppliesToExpensePlan(tier, expensePlanned)).toBe(true);
    expect(tierAppliesToExpensePlan(tier, expenseNullScope)).toBe(true);
    expect(tierAppliesToExpensePlan(tier, expenseUnplanned)).toBe(false);
  });
});
