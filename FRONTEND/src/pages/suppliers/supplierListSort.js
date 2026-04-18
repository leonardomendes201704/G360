/** Ordenação — fornecedores (`DataListTable`). */
export function sortSupplierRows(rows, orderBy, order) {
  const mult = order === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    let cmp = 0;
    const norm = (s) => (s?.status || 'ATIVO');
    switch (orderBy) {
      case 'name':
        cmp = String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR', { sensitivity: 'base' });
        break;
      case 'category':
        cmp = String(a.category || '').localeCompare(String(b.category || ''), 'pt-BR', { sensitivity: 'base' });
        break;
      case 'contact': {
        const la = a.contactName || a.tradeName || '';
        const lb = b.contactName || b.tradeName || '';
        cmp = String(la).localeCompare(String(lb), 'pt-BR', { sensitivity: 'base' });
        break;
      }
      case 'phone':
        cmp = String(a.phone || '').localeCompare(String(b.phone || ''), 'pt-BR', { numeric: true, sensitivity: 'base' });
        break;
      case 'rating':
        cmp = (Number(a.rating) || 5) - (Number(b.rating) || 5);
        break;
      case 'status':
        cmp = String(norm(a)).localeCompare(String(norm(b)), 'pt-BR', { sensitivity: 'base' });
        break;
      default:
        cmp = 0;
    }
    return mult * cmp;
  });
}
