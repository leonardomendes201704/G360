/** Ordenação — categorias do catálogo ITBM (DataListTable). */
export function sortCatalogCategoryRows(rows, orderBy, order) {
  const mult = order === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    let cmp = 0;
    switch (orderBy) {
      case 'name':
        cmp = String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR', { sensitivity: 'base' });
        break;
      default:
        cmp = 0;
    }
    return mult * cmp;
  });
}
