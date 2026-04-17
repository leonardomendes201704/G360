class HelpdeskMetricsService {
  /**
   * @param {import('@prisma/client').PrismaClient} prisma
   * @param {{ days?: number, whereTicket?: object }} opts
   *   whereTicket — filtro extra (ex.: âmbito de gestor: OR departamento/CC/solicitante)
   */
  static async getSummary(prisma, opts = {}) {
    const days = Number(opts.days) > 0 ? Number(opts.days) : 30;
    const since = new Date(Date.now() - days * 86400000);
    const now = new Date();
    const scope = opts.whereTicket && Object.keys(opts.whereTicket).length > 0 ? opts.whereTicket : null;

    const merge = (w) => {
      const hasW = w && typeof w === 'object' && Object.keys(w).length > 0;
      if (!scope) return hasW ? w : {};
      if (!hasW) return scope;
      return { AND: [scope, w] };
    };

    const [
      byStatus,
      resolvedInPeriod,
      openTickets,
      breachedOpen,
      byDepartment,
      byCostCenter
    ] = await Promise.all([
      prisma.ticket.groupBy({
        by: ['status'],
        where: merge({}),
        _count: { id: true }
      }),
      prisma.ticket.findMany({
        where: merge({
          resolvedAt: { gte: since },
          status: { in: ['RESOLVED', 'CLOSED'] }
        }),
        select: {
          createdAt: true,
          resolvedAt: true,
          respondedAt: true,
          slaBreached: true,
          slaResponseDue: true
        }
      }),
      prisma.ticket.findMany({
        where: merge({ status: { in: ['OPEN', 'IN_PROGRESS', 'WAITING_USER'] } } }),
        select: { createdAt: true, status: true }
      }),
      prisma.ticket.count({
        where: merge({
          slaBreached: true,
          status: { notIn: ['RESOLVED', 'CLOSED'] }
        })
      }),
      prisma.ticket.groupBy({
        by: ['departmentId'],
        where: merge({ departmentId: { not: null } }),
        _count: { id: true }
      }),
      prisma.ticket.groupBy({
        by: ['costCenterId'],
        where: merge({ costCenterId: { not: null } }),
        _count: { id: true }
      })
    ]);

    const statusMap = Object.fromEntries(byStatus.map((r) => [r.status, r._count.id]));

    let mttrMsSum = 0;
    let mttrCount = 0;
    let mtrsMsSum = 0;
    let mtrsCount = 0;
    let closedWithBreach = 0;
    let closedNoBreach = 0;

    for (const t of resolvedInPeriod) {
      if (t.resolvedAt && t.createdAt) {
        mttrMsSum += t.resolvedAt.getTime() - t.createdAt.getTime();
        mttrCount += 1;
      }
      if (t.respondedAt && t.createdAt) {
        mtrsMsSum += t.respondedAt.getTime() - t.createdAt.getTime();
        mtrsCount += 1;
      }
      if (t.slaBreached) closedWithBreach += 1;
      else closedNoBreach += 1;
    }

    const mttrHours = mttrCount ? mttrMsSum / mttrCount / 3600000 : null;
    const mtrsHours = mtrsCount ? mtrsMsSum / mtrsCount / 3600000 : null;

    const totalClosed = resolvedInPeriod.length;
    const slaCompliancePct =
      totalClosed > 0 ? Math.round((closedNoBreach / totalClosed) * 1000) / 10 : null;

    const backlogAge = { under24h: 0, between24And48h: 0, over48h: 0 };
    for (const t of openTickets) {
      const ageH = (now - t.createdAt.getTime()) / 3600000;
      if (ageH < 24) backlogAge.under24h += 1;
      else if (ageH < 48) backlogAge.between24And48h += 1;
      else backlogAge.over48h += 1;
    }

    const deptIds = byDepartment.map((r) => r.departmentId).filter(Boolean);
    const ccIds = byCostCenter.map((r) => r.costCenterId).filter(Boolean);
    const [deptRows, ccRows] = await Promise.all([
      deptIds.length
        ? prisma.department.findMany({
            where: { id: { in: deptIds } },
            select: { id: true, name: true, code: true }
          })
        : [],
      ccIds.length
        ? prisma.costCenter.findMany({
            where: { id: { in: ccIds } },
            select: { id: true, name: true, code: true }
          })
        : []
    ]);
    const deptMap = Object.fromEntries(deptRows.map((d) => [d.id, d]));
    const ccMap = Object.fromEntries(ccRows.map((c) => [c.id, c]));

    const byDepartmentEnriched = byDepartment.map((r) => ({
      departmentId: r.departmentId,
      count: r._count.id,
      department: r.departmentId ? deptMap[r.departmentId] || null : null
    }));
    const byCostCenterEnriched = byCostCenter.map((r) => ({
      costCenterId: r.costCenterId,
      count: r._count.id,
      costCenter: r.costCenterId ? ccMap[r.costCenterId] || null : null
    }));

    return {
      periodDays: days,
      since: since.toISOString(),
      countsByStatus: statusMap,
      openBacklog: openTickets.length,
      backlogAge,
      breachedOpen: breachedOpen,
      mttrHours,
      meanFirstResponseHours: mtrsHours,
      resolvedInPeriod: totalClosed,
      slaCompliancePct,
      byDepartment: byDepartmentEnriched,
      byCostCenter: byCostCenterEnriched
    };
  }
}

module.exports = HelpdeskMetricsService;
