const { normalizeCalendar, DEFAULT_CALENDAR } = require('../utils/business-hours.util');

class HelpdeskConfigService {
  static async getOrCreate(prisma) {
    let row = await prisma.helpdeskConfig.findUnique({ where: { id: 1 } });
    if (!row) {
      row = await prisma.helpdeskConfig.create({
        data: {
          id: 1,
          useBusinessCalendar: true,
          autoAssignOnCreate: true,
          calendar: DEFAULT_CALENDAR
        }
      });
    }
    return row;
  }

  static async get(prisma) {
    return this.getOrCreate(prisma);
  }

  static async update(prisma, data) {
    const { useBusinessCalendar, autoAssignOnCreate, calendar } = data;
    const payload = {};
    if (typeof useBusinessCalendar === 'boolean') {
      payload.useBusinessCalendar = useBusinessCalendar;
    }
    if (typeof autoAssignOnCreate === 'boolean') {
      payload.autoAssignOnCreate = autoAssignOnCreate;
    }
    if (calendar !== undefined) {
      payload.calendar = normalizeCalendar(calendar);
    }
    return prisma.helpdeskConfig.upsert({
      where: { id: 1 },
      create: {
        id: 1,
        useBusinessCalendar: payload.useBusinessCalendar ?? true,
        autoAssignOnCreate: payload.autoAssignOnCreate ?? true,
        calendar: payload.calendar ?? DEFAULT_CALENDAR
      },
      update: payload
    });
  }

  /** Calendário efetivo para cálculo de SLA */
  static async getEffectiveCalendar(prisma) {
    const row = await this.getOrCreate(prisma);
    return {
      useBusinessCalendar: row.useBusinessCalendar,
      calendar: normalizeCalendar(row.calendar)
    };
  }
}

module.exports = HelpdeskConfigService;
