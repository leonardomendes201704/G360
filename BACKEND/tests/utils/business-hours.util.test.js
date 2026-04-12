const { addBusinessMinutesUtc, normalizeCalendar, buildSlaDueDatesWallClockMinutes } = require('../../src/utils/business-hours.util');

describe('business-hours.util', () => {
  it('normalizeCalendar fills defaults', () => {
    const c = normalizeCalendar(null);
    expect(c.timezone).toBe('America/Sao_Paulo');
    expect(c.workdays.length).toBeGreaterThan(0);
  });

  it('wall clock adds raw minutes', () => {
    const base = new Date('2026-03-22T12:00:00.000Z');
    const d = buildSlaDueDatesWallClockMinutes(base, 60, 120);
    expect(d.slaResponseDue.getTime()).toBe(base.getTime() + 60 * 60000);
    expect(d.slaResolveDue.getTime()).toBe(base.getTime() + 120 * 60000);
  });

  it('treats configured holiday like non-working day', () => {
    const mon = new Date('2026-03-23T12:00:00.000Z');
    const out = addBusinessMinutesUtc(mon, 60, {
      timezone: 'America/Sao_Paulo',
      workdays: [1, 2, 3, 4, 5],
      startMinutes: 9 * 60,
      endMinutes: 18 * 60,
      holidays: ['2026-03-23']
    });
    expect(new Date(out).getTime()).toBeGreaterThan(mon.getTime());
  });

  it('treats holiday object { date, name } like non-working day', () => {
    const mon = new Date('2026-03-23T12:00:00.000Z');
    const out = addBusinessMinutesUtc(mon, 60, {
      timezone: 'America/Sao_Paulo',
      workdays: [1, 2, 3, 4, 5],
      startMinutes: 9 * 60,
      endMinutes: 18 * 60,
      holidays: [{ date: '2026-03-23', name: 'Feriado teste' }]
    });
    expect(new Date(out).getTime()).toBeGreaterThan(mon.getTime());
  });

  it('addBusinessMinutesUtc respects weekend skip (Mon start)', () => {
    // 2026-03-21 is Saturday
    const sat = new Date('2026-03-21T10:00:00.000Z');
    const out = addBusinessMinutesUtc(sat, 60, {
      timezone: 'America/Sao_Paulo',
      workdays: [1, 2, 3, 4, 5],
      startMinutes: 9 * 60,
      endMinutes: 18 * 60
    });
    const dt = new Date(out);
    expect(dt.getTime()).toBeGreaterThan(sat.getTime());
  });

  it('addBusinessMinutesUtc uses specific schedule per weekday', () => {
    const mondayMorningUtc = new Date('2026-03-23T11:00:00.000Z'); // 08:00 em America/Sao_Paulo
    const out = addBusinessMinutesUtc(mondayMorningUtc, 60, {
      timezone: 'America/Sao_Paulo',
      daySchedules: {
        1: { enabled: true, startMinutes: 10 * 60, endMinutes: 19 * 60 }, // seg abre 10:00
        2: { enabled: true, startMinutes: 9 * 60, endMinutes: 18 * 60 },
        3: { enabled: true, startMinutes: 9 * 60, endMinutes: 18 * 60 },
        4: { enabled: true, startMinutes: 9 * 60, endMinutes: 18 * 60 },
        5: { enabled: true, startMinutes: 9 * 60, endMinutes: 18 * 60 },
        6: { enabled: false, startMinutes: 9 * 60, endMinutes: 18 * 60 },
        7: { enabled: false, startMinutes: 9 * 60, endMinutes: 18 * 60 }
      }
    });
    // Deve começar a contar só às 10:00 local; +60min => 11:00 local (= 14:00 UTC)
    expect(new Date(out).toISOString()).toBe('2026-03-23T14:00:00.000Z');
  });
});
