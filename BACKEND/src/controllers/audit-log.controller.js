const logger = require('../config/logger');
const { buildAuditLogWhere } = require('../utils/audit-log-scope.util');

function csvEscape(value) {
  if (value == null) return '';
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

class AuditLogController {
  static async list(req, res) {
    try {
      const { userId } = req.user;
      const { page = 1, limit = 20, module, start, end } = req.query;

      const { error, where } = await buildAuditLogWhere(req.prisma, userId, { module, start, end });
      if (error === 'USER_NOT_FOUND') {
        return res.status(404).json({ error: 'User not found' });
      }

      const total = await req.prisma.auditLog.count({ where });

      const logs = await req.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: Number(limit),
        skip: (Number(page) - 1) * Number(limit),
        include: {
          user: { select: { name: true, email: true } },
        },
      });

      return res.json({
        data: logs,
        pagination: {
          total,
          page: Number(page),
          pages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error) {
      logger.error(error);
      return res.status(500).json({ error: 'Erro ao buscar logs de auditoria' });
    }
  }

  /**
   * Export CSV (compliance) — mesmos filtros RBAC e query que `list`.
   * Limite máximo via env `AUDIT_LOG_EXPORT_MAX` (default 10000).
   */
  static async exportCsv(req, res) {
    try {
      const { userId } = req.user;
      const { module, start, end } = req.query;

      const maxRaw = process.env.AUDIT_LOG_EXPORT_MAX;
      const maxAllowed = maxRaw != null && maxRaw !== '' ? Math.min(Number(maxRaw), 100000) : 10000;
      const take = Number.isFinite(maxAllowed) && maxAllowed > 0 ? maxAllowed : 10000;

      const { error, where } = await buildAuditLogWhere(req.prisma, userId, { module, start, end });
      if (error === 'USER_NOT_FOUND') {
        return res.status(404).json({ error: 'User not found' });
      }

      const rows = await req.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take,
        include: {
          user: { select: { name: true, email: true } },
        },
      });

      const header = [
        'createdAt',
        'action',
        'module',
        'entityType',
        'entityId',
        'userEmail',
        'userName',
        'ipAddress',
        'userAgent',
        'oldData',
        'newData',
      ].join(',');

      const lines = rows.map((row) =>
        [
          csvEscape(row.createdAt?.toISOString?.() || row.createdAt),
          csvEscape(row.action),
          csvEscape(row.module),
          csvEscape(row.entityType),
          csvEscape(row.entityId),
          csvEscape(row.user?.email),
          csvEscape(row.user?.name),
          csvEscape(row.ipAddress),
          csvEscape(row.userAgent),
          csvEscape(row.oldData != null ? JSON.stringify(row.oldData) : ''),
          csvEscape(row.newData != null ? JSON.stringify(row.newData) : ''),
        ].join(',')
      );

      const csv = [header, ...lines].join('\n');
      const filename = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send('\uFEFF' + csv);
    } catch (error) {
      logger.error(error);
      return res.status(500).json({ error: 'Erro ao exportar logs de auditoria' });
    }
  }
}

module.exports = AuditLogController;
