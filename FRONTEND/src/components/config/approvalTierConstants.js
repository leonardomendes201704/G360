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
