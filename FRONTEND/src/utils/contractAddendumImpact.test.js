import { describe, it, expect } from 'vitest';
import {
  sortAddendumsChronological,
  computeContractStateAfterAddendums,
  computeAddendumContractImpact,
} from './contractAddendumImpact';

describe('contractAddendumImpact', () => {
  const contract = {
    originalValue: 1000,
    originalEndDate: '2025-12-31',
    value: 1300,
    endDate: '2026-06-30',
  };

  const addA = {
    id: 'a',
    signatureDate: '2025-06-01',
    createdAt: '2025-06-01T10:00:00Z',
    valueChange: 100,
    newEndDate: null,
  };
  const addB = {
    id: 'b',
    signatureDate: '2025-09-01',
    createdAt: '2025-09-01T10:00:00Z',
    valueChange: 200,
    newEndDate: '2026-06-30',
  };

  it('sortAddendumsChronological orders by signatureDate', () => {
    const s = sortAddendumsChronological([addB, addA]);
    expect(s.map((x) => x.id)).toEqual(['a', 'b']);
  });

  it('computeContractStateAfterAddendums: 0 adds = baseline', () => {
    const asc = sortAddendumsChronological([addA, addB]);
    const s0 = computeContractStateAfterAddendums(contract, asc, 0);
    expect(s0.value).toBe(1000);
    expect(s0.endDate?.toISOString().slice(0, 10)).toBe('2025-12-31');
  });

  it('computeContractStateAfterAddendums: after both adds', () => {
    const asc = sortAddendumsChronological([addA, addB]);
    const s2 = computeContractStateAfterAddendums(contract, asc, 2);
    expect(s2.value).toBe(1300);
    expect(s2.endDate?.toISOString().slice(0, 10)).toBe('2026-06-30');
  });

  it('computeAddendumContractImpact for second addendum', () => {
    const asc = [addA, addB];
    const imp = computeAddendumContractImpact(contract, asc, 'b');
    expect(imp.before.value).toBe(1100);
    expect(imp.after.value).toBe(1300);
    expect(imp.before.endDate?.toISOString().slice(0, 10)).toBe('2025-12-31');
    expect(imp.after.endDate?.toISOString().slice(0, 10)).toBe('2026-06-30');
  });
});
