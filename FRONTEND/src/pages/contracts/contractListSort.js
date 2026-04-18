import { getContractStatus } from './contractListUtils';

/** Ordenação — lista de contratos (`DataListTable`). */
export function sortContractRows(rows, orderBy, order) {
  const mult = order === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    let cmp = 0;
    switch (orderBy) {
      case 'number':
        cmp = String(a.number || '').localeCompare(String(b.number || ''), 'pt-BR', { numeric: true, sensitivity: 'base' });
        break;
      case 'supplier':
        cmp = String(a.supplier?.name || '').localeCompare(String(b.supplier?.name || ''), 'pt-BR', { sensitivity: 'base' });
        break;
      case 'description':
        cmp = String(a.description || '').localeCompare(String(b.description || ''), 'pt-BR', { sensitivity: 'base' });
        break;
      case 'period':
        cmp = new Date(a.endDate || 0).getTime() - new Date(b.endDate || 0).getTime();
        break;
      case 'value':
        cmp = Number(a.value) - Number(b.value);
        break;
      case 'status':
        cmp = String(getContractStatus(a)).localeCompare(String(getContractStatus(b)), 'pt-BR', { sensitivity: 'base' });
        break;
      default:
        cmp = 0;
    }
    return mult * cmp;
  });
}
