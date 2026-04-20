/**
 * Extrai entradas Keep-a-Changelog (`## [AAAA-MM-DD]`) de um ficheiro markdown bruto.
 * @param {string} raw — conteúdo completo do CHANGELOG.md
 * @returns {{ id: string, dateStr: string, sortKey: number, preview: string, rawBody: string }[]}
 */
export function parseChangelog(raw) {
  if (!raw || typeof raw !== 'string') return [];

  const parts = raw.split(/^## \[/m);
  const out = [];

  for (let i = 1; i < parts.length; i++) {
    const chunk = parts[i];
    const closeIdx = chunk.indexOf(']');
    if (closeIdx === -1) continue;

    const insideBrackets = chunk.slice(0, closeIdx).trim();
    const rawBody = chunk.slice(closeIdx + 1).trim();

    const dm = insideBrackets.match(/^(\d{4}-\d{2}-\d{2})/);
    const dateStr = dm ? dm[1] : insideBrackets;
    const sortKey = dm ? Date.parse(`${dm[1]}T00:00:00`) : 0;

    const preview = buildPreview(rawBody);

    out.push({
      id: dateStr,
      dateStr,
      sortKey: Number.isNaN(sortKey) ? 0 : sortKey,
      preview,
      rawBody,
    });
  }

  return out;
}

function buildPreview(body, maxLen = 220) {
  const lines = body.split(/\r?\n/);
  for (const line of lines) {
    const t = line.trim();
    if (t.startsWith('- ')) {
      const one = t.replace(/^-\s+/, '').replace(/\*\*/g, '');
      return one.length > maxLen ? `${one.slice(0, maxLen)}…` : one;
    }
  }
  const flat = body.replace(/\s+/g, ' ').trim();
  if (!flat) return '—';
  return flat.length > maxLen ? `${flat.slice(0, maxLen)}…` : flat;
}

/** Ordenação por data (coluna `sortKey`). */
export function sortChangelogRows(rows, orderBy, order) {
  const mult = order === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    let cmp = 0;
    switch (orderBy) {
      case 'date':
        cmp = (a.sortKey || 0) - (b.sortKey || 0);
        break;
      case 'preview':
        cmp = String(a.preview || '').localeCompare(String(b.preview || ''), 'pt-BR', { sensitivity: 'base' });
        break;
      default:
        cmp = 0;
    }
    return mult * cmp;
  });
}
