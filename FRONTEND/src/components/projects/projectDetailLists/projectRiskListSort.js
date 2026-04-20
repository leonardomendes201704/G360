/** Ordenação — riscos do projeto (`DataListTable`, aba Riscos). */

const IMPACT_RANK = {
  CRITICO: 4,
  MUITO_ALTO: 4,
  ALTO: 3,
  MEDIO: 2,
  BAIXO: 1,
  MUITO_BAIXO: 0,
};

function impactSortValue(impact) {
  return IMPACT_RANK[impact] ?? 0;
}

export function sortProjectRiskRows(rows, orderBy, order) {
  const mult = order === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    let cmp = 0;
    switch (orderBy) {
      case 'id':
        cmp = String(a.id || '').localeCompare(String(b.id || ''), 'pt-BR', { numeric: true, sensitivity: 'base' });
        break;
      case 'description':
        cmp = String(a.description || '').localeCompare(String(b.description || ''), 'pt-BR', { sensitivity: 'base' });
        break;
      case 'category':
        cmp = String(a.category || '').localeCompare(String(b.category || ''), 'pt-BR', { sensitivity: 'base' });
        break;
      case 'impact':
        cmp = impactSortValue(a.impact) - impactSortValue(b.impact);
        break;
      case 'status':
        cmp = String(a.status || '').localeCompare(String(b.status || ''), 'pt-BR', { sensitivity: 'base' });
        break;
      default:
        cmp = 0;
    }
    return mult * cmp;
  });
}
