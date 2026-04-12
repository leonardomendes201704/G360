const { DateTime } = require('luxon');

/**
 * @typedef {{ date: string, name: string }} HolidayEntry
 * @typedef {{ enabled?: boolean, startMinutes?: number, endMinutes?: number }} DaySchedule
 * @typedef {{ timezone?: string, workdays?: number[], startMinutes?: number, endMinutes?: number, daySchedules?: Record<string|number, DaySchedule>, holidays?: (string|HolidayEntry)[] }} BusinessCalendarJson
 */

const DEFAULT_CALENDAR = {
  timezone: 'America/Sao_Paulo',
  workdays: [1, 2, 3, 4, 5],
  startMinutes: 9 * 60,
  endMinutes: 18 * 60,
  holidays: []
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function clampMinute(v, fallback) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(24 * 60 - 1, Math.floor(n)));
}

function normalizeSingleDaySchedule(raw, fallback) {
  const enabled = raw && typeof raw === 'object' ? raw.enabled !== false : fallback.enabled;
  const startMinutes = clampMinute(raw?.startMinutes, fallback.startMinutes);
  const endMinutes = clampMinute(raw?.endMinutes, fallback.endMinutes);
  if (endMinutes <= startMinutes) {
    return {
      enabled: false,
      startMinutes: fallback.startMinutes,
      endMinutes: fallback.endMinutes
    };
  }
  return { enabled, startMinutes, endMinutes };
}

/**
 * Aceita legado `YYYY-MM-DD` ou `{ date, name? }`.
 * @param {unknown} h
 * @returns {HolidayEntry|null}
 */
function normalizeHolidayEntry(h) {
  if (h == null) return null;
  if (typeof h === 'string') {
    const d = h.trim().slice(0, 10);
    return DATE_RE.test(d) ? { date: d, name: '' } : null;
  }
  if (typeof h === 'object' && h.date != null) {
    const d = String(h.date).trim().slice(0, 10);
    if (!DATE_RE.test(d)) return null;
    let name = '';
    if (typeof h.name === 'string') {
      name = h.name.trim().slice(0, 200);
    }
    return { date: d, name };
  }
  return null;
}

/**
 * @param {unknown[]} arr
 * @returns {HolidayEntry[]}
 */
function normalizeHolidaysArray(arr) {
  if (!Array.isArray(arr)) return [];
  const byDate = new Map();
  for (const item of arr) {
    const e = normalizeHolidayEntry(item);
    if (!e) continue;
    const prev = byDate.get(e.date);
    if (!prev) {
      byDate.set(e.date, e);
    } else {
      const name = e.name || prev.name ? (e.name || prev.name) : '';
      byDate.set(e.date, { date: e.date, name });
    }
  }
  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Normaliza config vinda do JSON (HelpdeskConfig.calendar).
 * `holidays`: lista de `{ date: 'YYYY-MM-DD', name: string }` (legado: só strings de data).
 * @param {object|null|undefined} raw
 * @returns {Required<Omit<BusinessCalendarJson, 'holidays'>> & { holidays: HolidayEntry[] }}
 */
function normalizeCalendar(raw) {
  if (!raw || typeof raw !== 'object') {
    const daySchedules = {};
    for (let d = 1; d <= 7; d += 1) {
      daySchedules[d] = {
        enabled: DEFAULT_CALENDAR.workdays.includes(d),
        startMinutes: DEFAULT_CALENDAR.startMinutes,
        endMinutes: DEFAULT_CALENDAR.endMinutes
      };
    }
    return { ...DEFAULT_CALENDAR, holidays: [], daySchedules };
  }
  const holidays = normalizeHolidaysArray(raw.holidays);
  const baseWorkdays = Array.isArray(raw.workdays) && raw.workdays.length
    ? raw.workdays.map((n) => Number(n)).filter((n) => n >= 1 && n <= 7)
    : DEFAULT_CALENDAR.workdays;
  const baseStart = clampMinute(raw.startMinutes, DEFAULT_CALENDAR.startMinutes);
  const baseEnd = clampMinute(raw.endMinutes, DEFAULT_CALENDAR.endMinutes);
  const daySchedules = {};
  for (let d = 1; d <= 7; d += 1) {
    const fallback = {
      enabled: baseWorkdays.includes(d),
      startMinutes: baseStart,
      endMinutes: baseEnd
    };
    const rawSchedule = raw.daySchedules?.[d] ?? raw.daySchedules?.[String(d)];
    daySchedules[d] = normalizeSingleDaySchedule(rawSchedule, fallback);
  }
  const workdays = Object.keys(daySchedules)
    .map((k) => Number(k))
    .filter((d) => daySchedules[d]?.enabled)
    .sort((a, b) => a - b);
  const firstEnabled = workdays.find((d) => daySchedules[d]);

  return {
    timezone: typeof raw.timezone === 'string' ? raw.timezone : DEFAULT_CALENDAR.timezone,
    workdays,
    startMinutes: firstEnabled ? daySchedules[firstEnabled].startMinutes : baseStart,
    endMinutes: firstEnabled ? daySchedules[firstEnabled].endMinutes : baseEnd,
    daySchedules,
    holidays
  };
}

/**
 * Soma minutos úteis a partir de um instante UTC (considerando fuso, janela diária e feriados).
 * @param {Date|string|number} startUtc
 * @param {number} minutesToAdd
 * @param {BusinessCalendarJson} cal
 */
function addBusinessMinutesUtc(startUtc, minutesToAdd, cal) {
  if (minutesToAdd <= 0) {
    return new Date(startUtc);
  }

  const c = normalizeCalendar(cal);
  const tz = c.timezone;
  const daySchedules = c.daySchedules || {};
  const holidaySet = new Set((c.holidays || []).map((h) => (typeof h === 'string' ? h : h.date)).filter(Boolean));

  let dt = DateTime.fromJSDate(new Date(startUtc), { zone: 'utc' }).setZone(tz);
  let remaining = Math.ceil(minutesToAdd);
  let guard = 0;
  const maxIter = 200000;

  while (remaining > 0 && guard++ < maxIter) {
    const wd = dt.weekday;
    const dayKey = dt.toFormat('yyyy-MM-dd');
    const schedule = daySchedules[wd] || { enabled: false, startMinutes: c.startMinutes, endMinutes: c.endMinutes };
    const startMin = clampMinute(schedule.startMinutes, c.startMinutes);
    const endMin = clampMinute(schedule.endMinutes, c.endMinutes);
    const dayStart = dt.set({
      hour: Math.floor(startMin / 60),
      minute: startMin % 60,
      second: 0,
      millisecond: 0
    });
    const dayEnd = dt.set({
      hour: Math.floor(endMin / 60),
      minute: endMin % 60,
      second: 0,
      millisecond: 0
    });

    if (!schedule.enabled || holidaySet.has(dayKey) || endMin <= startMin) {
      dt = dayStart.plus({ days: 1 });
      continue;
    }

    if (dt < dayStart) {
      dt = dayStart;
    }

    if (dt >= dayEnd) {
      dt = dayStart.plus({ days: 1 });
      continue;
    }

    const minsUntilClose = Math.floor(dayEnd.diff(dt, 'minutes').minutes);
    if (minsUntilClose <= 0) {
      dt = dayStart.plus({ days: 1 });
      continue;
    }

    const chunk = Math.min(remaining, minsUntilClose);
    dt = dt.plus({ minutes: chunk });
    remaining -= chunk;
  }

  return dt.toUTC().toJSDate();
}

/**
 * Pares de prazos (1ª resposta e resolução) a partir de agora ou calendário 24/7.
 */
function buildSlaDueDatesWallClockMinutes(baseDate, responseMin, resolveMin) {
  const base = new Date(baseDate);
  return {
    slaResponseDue: new Date(base.getTime() + responseMin * 60 * 1000),
    slaResolveDue: new Date(base.getTime() + resolveMin * 60 * 1000)
  };
}

function buildSlaDueDatesBusinessMinutes(baseDate, responseMin, resolveMin, cal) {
  const base = new Date(baseDate);
  return {
    slaResponseDue: addBusinessMinutesUtc(base, responseMin, cal),
    slaResolveDue: addBusinessMinutesUtc(base, resolveMin, cal)
  };
}

module.exports = {
  normalizeCalendar,
  addBusinessMinutesUtc,
  DEFAULT_CALENDAR,
  buildSlaDueDatesWallClockMinutes,
  buildSlaDueDatesBusinessMinutes
};
