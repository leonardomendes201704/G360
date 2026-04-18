/**
 * Ordenação da lista de artigos (base de conhecimento) — `DataListTable`.
 */
export function sortKnowledgeArticleRows(rows, orderBy, order) {
  const mult = order === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    let cmp = 0;
    switch (orderBy) {
      case 'title':
        cmp = String(a.title || '').localeCompare(String(b.title || ''), 'pt-BR', { sensitivity: 'base' });
        break;
      case 'categoryName':
        cmp = String(a.category?.name || '').localeCompare(String(b.category?.name || ''), 'pt-BR', {
          sensitivity: 'base',
        });
        break;
      case 'authorName':
        cmp = String(a.author?.name || '').localeCompare(String(b.author?.name || ''), 'pt-BR', { sensitivity: 'base' });
        break;
      case 'views': {
        cmp = (Number(a.views) || 0) - (Number(b.views) || 0);
        break;
      }
      case 'createdAt': {
        const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        cmp = da - db;
        break;
      }
      default:
        cmp = 0;
    }
    return mult * cmp;
  });
}
