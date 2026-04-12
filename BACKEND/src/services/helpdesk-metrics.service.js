class HelpdeskMetricsService {
  /**
   * @param {import('@prisma/client').PrismaClient} prisma
   * @param {{ days?: number }} opts
   */
  static async getSummary(prisma, opts = {}) {
    const days = Number(opts.days) > 0 ? Number(opts.days) : 30;
    const since = new Date(Date.now() - days * 86400000);
    const now = new Date();

    const [
      byStatus,
      resolvedInPeriod,
      openTickets,
      breachedOpen
    ] = await Promise.all([
      prisma.ticket.groupBy({
        by: ['status'],
        _count: { id: true }
      }),
      prisma.ticket.findMany({
        where: {
          resolvedAt: { gte: since },
          status: { in: ['RESOLVED', 'CLOSED'] }
        },
        select: {
          createdAt: true,
          resolvedAt: true,
          respondedAt: true,
          slaBreached: true,
          slaResponseDue: true
        }
      }),
      prisma.ticket.findMany({
        where: { status: { in: ['OPEN', 'IN_PROGRESS', 'WAITING_USER'] } },
        select: { createdAt: true, status: true }
      }),
      prisma.ticket.count({
        where: {
          slaBreached: true,
          status: { notIn: ['RESOLVED', 'CLOSED'] }
        }
      })
    ]);

    const statusMap = Object.fromEntries(byStatus.map((r) => [r.status, r._count.id]));

    let mttrMsSum = 0;
    let mttrCount = 0;
    let mtrsMsSum = 0;
    let mtrsCount = 0;
    let closedNoBreach = 0;
    let closedWithBreach = 0;

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
      slaCompliancePct
    };
  }
}

module.exports = HelpdeskMetricsService;
