function parseUtcDate(dateString) {
  if (!dateString) return 0;
  const date = new Date(dateString);
  const off = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() + off).getTime();
}

/** Ordenação — anos fiscais (aba Organização, `DataListTable`). */
export function sortFiscalYearRows(rows, orderBy, order) {
  const mult = order === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    let cmp = 0;
    switch (orderBy) {
      case 'year':
        cmp = (Number(a.year) || 0) - (Number(b.year) || 0);
        break;
      case 'startDate':
        cmp = parseUtcDate(a.startDate) - parseUtcDate(b.startDate);
        break;
      case 'endDate':
        cmp = parseUtcDate(a.endDate) - parseUtcDate(b.endDate);
        break;
      case 'isClosed':
        cmp = a.isClosed === b.isClosed ? 0 : a.isClosed ? 1 : -1;
        break;
      default:
        cmp = 0;
    }
    return mult * cmp;
  });
}
