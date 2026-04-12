const HelpdeskConfigService = require('../services/helpdesk-config.service');
const yup = require('yup');

class HelpdeskConfigController {
  static async show(req, res) {
    try {
      const data = await HelpdeskConfigService.get(req.prisma);
      return res.status(200).json(data);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  static async update(req, res) {
    try {
      const schema = yup.object().shape({
        useBusinessCalendar: yup.boolean(),
        autoAssignOnCreate: yup.boolean(),
        calendar: yup
          .object({
            timezone: yup.string(),
            workdays: yup.array().of(yup.number().min(1).max(7)),
            startMinutes: yup.number().min(0).max(24 * 60),
            endMinutes: yup.number().min(0).max(24 * 60),
            daySchedules: yup.object().test('day-schedules', 'daySchedules inválido', (v) => {
              if (v == null) return true;
              if (typeof v !== 'object') return false;
              const keys = Object.keys(v);
              return keys.every((k) => {
                if (!/^[1-7]$/.test(String(k))) return false;
                const item = v[k];
                if (!item || typeof item !== 'object') return false;
                if (item.enabled !== undefined && typeof item.enabled !== 'boolean') return false;
                if (item.startMinutes !== undefined && (!Number.isFinite(item.startMinutes) || item.startMinutes < 0 || item.startMinutes > 24 * 60)) return false;
                if (item.endMinutes !== undefined && (!Number.isFinite(item.endMinutes) || item.endMinutes < 0 || item.endMinutes > 24 * 60)) return false;
                return true;
              });
            }),
            holidays: yup.array().of(
              yup.mixed().test('holiday', 'Data de feriado inválida', (v) => {
                if (typeof v === 'string') return /^\d{4}-\d{2}-\d{2}$/.test(v);
                if (v && typeof v === 'object' && typeof v.date === 'string') {
                  return /^\d{4}-\d{2}-\d{2}$/.test(v.date);
                }
                return false;
              })
            )
          })
          .nullable()
      });
      const payload = await schema.validate(req.body, { stripUnknown: true });
      const data = await HelpdeskConfigService.update(req.prisma, payload);
      return res.status(200).json(data);
    } catch (error) {
      if (error.name === 'ValidationError') return res.status(400).json({ error: error.message });
      return res.status(400).json({ error: error.message });
    }
  }
}

module.exports = HelpdeskConfigController;
