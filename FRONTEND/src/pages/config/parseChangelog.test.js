import { describe, it, expect } from 'vitest';
import { parseChangelog, sortChangelogRows } from './parseChangelog';

describe('parseChangelog', () => {
  it('extrai versões e pré-visualização do primeiro bullet', () => {
    const raw = `# Changelog

Intro.

---

## [2026-01-01]

### Fixed
- Primeiro item **negrito** para preview.

## [2026-02-15]

### Refactored
- Segunda versão com texto longo que deve aparecer truncado no preview quando configurado manualmente mas aqui curto.
`;

    const entries = parseChangelog(raw);
    expect(entries).toHaveLength(2);
    expect(entries[0].dateStr).toBe('2026-01-01');
    expect(entries[0].preview).toContain('Primeiro item');
    expect(entries[0].rawBody).toContain('### Fixed');
    expect(entries[1].dateStr).toBe('2026-02-15');
  });

  it('retorna array vazio para input inválido', () => {
    expect(parseChangelog('')).toEqual([]);
    expect(parseChangelog(null)).toEqual([]);
  });
});

describe('sortChangelogRows', () => {
  it('ordena por data descendente', () => {
    const rows = [
      { sortKey: Date.parse('2026-01-01T00:00:00'), preview: 'a' },
      { sortKey: Date.parse('2026-03-01T00:00:00'), preview: 'b' },
    ];
    const sorted = sortChangelogRows(rows, 'date', 'desc');
    expect(sorted[0].sortKey).toBeGreaterThan(sorted[1].sortKey);
  });
});
