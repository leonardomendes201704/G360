import { describe, it, expect } from 'vitest';
import { parseLocalCalendarDateInput, formatDate, formatDueDate } from './dateUtils';

describe('parseLocalCalendarDateInput (TAR-04)', () => {
  it('parses YYYY-MM-DD as local calendar day at noon', () => {
    const d = parseLocalCalendarDateInput('2026-04-30');
    expect(d).not.toBeNull();
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(3);
    expect(d.getDate()).toBe(30);
    expect(d.getHours()).toBe(12);
  });

  it('formats plain date without shifting day (pt-BR calendar)', () => {
    expect(formatDate('2026-04-30')).toBe('30/04/2026');
  });

  it('formatDueDate returns object label for future deadline', () => {
    const far = parseLocalCalendarDateInput('2030-06-15');
    const fd = formatDueDate(far);
    expect(typeof fd).toBe('object');
    expect(fd.label).toContain('2030');
  });
});
