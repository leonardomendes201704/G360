export const APPROVAL_TIER_ENTITY_OPTIONS = [
  { value: 'EXPENSE', label: 'Despesas (financeiro)' },
  { value: 'PROJECT_COST', label: 'Custos de projeto' },
  { value: 'PROJECT', label: 'Projeto (baseline / execução)' },
  { value: 'MEETING_MINUTE', label: 'Atas de reunião' },
  { value: 'PROPOSAL', label: 'Propostas comerciais' },
  { value: 'BUDGET', label: 'Orçamento anual' },
];

export function approvalTierEntityLabel(v) {
  return APPROVAL_TIER_ENTITY_OPTIONS.find((o) => o.value === v)?.label || v;
}

/** Âmbito da despesa para alçadas `entityType === EXPENSE'` (null/ALL = qualquer). */
export const EXPENSE_PLAN_SCOPE_OPTIONS = [
  { value: 'ALL', label: 'Todas (previstas e extra-orçamentárias)' },
  { value: 'PLANNED', label: 'Só custo previsto (no orçamento)' },
  { value: 'UNPLANNED', label: 'Só custo não previsto (extra-orçamentário)' },
];

export function approvalTierExpensePlanScopeLabel(v) {
  if (v == null || v === '' || v === 'ALL') return 'Todas';
  return EXPENSE_PLAN_SCOPE_OPTIONS.find((o) => o.value === v)?.label || v;
}
