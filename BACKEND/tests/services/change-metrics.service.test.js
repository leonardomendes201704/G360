const ChangeMetricsService = require('../../src/services/change-metrics.service');
const accessScope = require('../../src/utils/access-scope');

jest.mock('../../src/repositories/change-metrics.repository');
jest.mock('../../src/utils/access-scope');

const generatePrismaMock = () => ({
    changeRequest: {
        count: jest.fn(),
        groupBy: jest.fn(),
        findMany: jest.fn()
    }
});

describe('ChangeMetricsService', () => {
    let mockPrisma;

    beforeEach(() => {
        jest.clearAllMocks();
        mockPrisma = generatePrismaMock();
        
        // Base valid admin mock
        accessScope.getUserAccessScope.mockResolvedValue({ isAdmin: true });
        accessScope.getAccessibleUserIds.mockResolvedValue([]);
    });

    describe('getMetrics', () => {
         it('should map filter dates implicitly and process clean 100% metrics native', async () => {
              mockPrisma.changeRequest.count.mockResolvedValue(10);
              mockPrisma.changeRequest.groupBy.mockResolvedValue([]);
              mockPrisma.changeRequest.findMany.mockResolvedValue([]);

              const result = await ChangeMetricsService.getMetrics(mockPrisma, {}, 'u1');

              expect(result.summary.total).toBe(10);
              expect(result.summary.successRate).toBe(100);
              expect(result.summary.mttrHours).toBe(0);
              expect(result.summary.onTimeRate).toBe(100);
         });

         it('should calculate specific metrics processing times effectively through fallback scopes', async () => {
              mockPrisma.changeRequest.count.mockResolvedValue(10);
              // groupBy mocks
              mockPrisma.changeRequest.groupBy
                   .mockResolvedValueOnce([{ status: 'EXECUTED', _count: { id: 8 } }, { status: 'FAILED', _count: { id: 2 } }])
                   .mockResolvedValueOnce([{ type: 'EMERGENCY', _count: { id: 1 } }])
                   .mockResolvedValueOnce([{ riskLevel: 'HIGH', _count: { id: 1 } }]);
              
              // findMany mocks
              const d1 = new Date('2025-01-01T10:00:00Z');
              const d2 = new Date('2025-01-01T12:00:00Z'); // 2 hours diff actual
              const d3 = new Date('2025-01-02T10:00:00Z');
              const d4 = new Date('2025-01-02T14:00:00Z'); // 4 hours diff scheduled
              
              // 1 executed late, 1 executed on time using fallback
              mockPrisma.changeRequest.findMany
                   .mockResolvedValueOnce([
                       { actualStart: d1, actualEnd: d2, scheduledStart: d1, scheduledEnd: d1 }, // late (actualEnd > scheduledEnd)
                       { actualStart: null, actualEnd: null, scheduledStart: d3, scheduledEnd: d4 } // on time via fallback
                   ])
                   .mockResolvedValueOnce([
                       { scheduledStart: d1 }, // byDay grouping
                       { scheduledStart: d3 },
                       { scheduledStart: d3 } 
                   ]);

              const result = await ChangeMetricsService.getMetrics(mockPrisma, { startDate: '2025-01-01', endDate: '2025-01-31' }, 'u1');

              expect(result.summary.successRate).toBe(80); // (8 / (8 + 2)) * 100
              expect(result.summary.mttrHours).toBe(3); // (2 + 4) / 2 = 3
              // on time rate: the 2nd request is on time. The 1st is late. 1/2 = 50%
              expect(result.summary.onTimeRate).toBe(50);
              
              const day1 = d1.toISOString().split('T')[0];
              const day2 = d3.toISOString().split('T')[0];
              expect(result.highConcetrationDays).toEqual([
                   { day: day2, count: 2 },
                   { day: day1, count: 1 }
              ]);
         });

         it('should enforce complex access scopes accurately mapping OR arrays', async () => {
              // Not admin
              accessScope.getUserAccessScope.mockResolvedValue({ isAdmin: false, isManager: true, accessibleCostCenterIds: ['c1'] });
              accessScope.getAccessibleUserIds.mockResolvedValue(['u2']);
              
              mockPrisma.changeRequest.count.mockResolvedValue(1);
              mockPrisma.changeRequest.groupBy.mockResolvedValue([]);
              mockPrisma.changeRequest.findMany.mockResolvedValue([]);

              await ChangeMetricsService.getMetrics(mockPrisma, {}, 'u1');

              expect(mockPrisma.changeRequest.count).toHaveBeenCalledWith(expect.objectContaining({
                  where: expect.objectContaining({
                      AND: [
                          {
                              OR: [
                                  { requesterId: { in: ['u2'] } },
                                  { approvers: { some: { userId: 'u1' } } },
                                  { assets: { some: { costCenterId: { in: ['c1'] } } } }
                              ]
                          }
                      ]
                  })
              }));
         });

         it('should return empty OR scoping when passing omitted userId variables natively', async () => {
              mockPrisma.changeRequest.count.mockResolvedValue(0);
              mockPrisma.changeRequest.groupBy.mockResolvedValue([]);
              mockPrisma.changeRequest.findMany.mockResolvedValue([]);

              await ChangeMetricsService.getMetrics(mockPrisma, {}, null);

              // it should not add ANY OR conditions
              expect(mockPrisma.changeRequest.count).toHaveBeenCalledWith(expect.objectContaining({
                  where: { createdAt: expect.any(Object) } // no AND clause
              }));
         });
    });

    describe('getPIRReport', () => {
         it('should query PIR reports identifying distinct string patterns natively', async () => {
              mockPrisma.changeRequest.findMany.mockResolvedValue([
                  { rootCause: 'falha no ambiente de producao' },
                  { rootCause: 'erro de COMUNICACAO entre equipes' },
                  { rootCause: 'falta de teste unitario' },
                  { rootCause: 'tempo escasso para validacao' },
                  { rootCause: 'problema TECNICO no servidor' },
                  { rootCause: null }
              ]);

              const result = await ChangeMetricsService.getPIRReport(mockPrisma, {}, 'u1');

              expect(result.totalPIRs).toBe(6);
              expect(result.rootCausePatterns['Ambiente']).toBe(1);
              expect(result.rootCausePatterns['Comunicacao']).toBe(1);
              expect(result.rootCausePatterns['Testes Insuficientes']).toBe(1);
              expect(result.rootCausePatterns['Prazo Insuficiente']).toBe(1);
              expect(result.rootCausePatterns['Tecnico']).toBe(1);
         });

         it('should inject access scopes correctly handling start and end date injections', async () => {
              accessScope.getUserAccessScope.mockResolvedValue({ isAdmin: false });
              accessScope.getAccessibleUserIds.mockResolvedValue([]);
              mockPrisma.changeRequest.findMany.mockResolvedValue([]);

              await ChangeMetricsService.getPIRReport(mockPrisma, { startDate: '2025-01-01', endDate: '2025-01-31' }, 'u1');
              
              expect(mockPrisma.changeRequest.findMany).toHaveBeenCalledWith(expect.objectContaining({
                  where: expect.objectContaining({ AND: [{ OR: [{ approvers: { some: { userId: 'u1' } } }] }] })
              }));
         });
    });

    describe('getTrends', () => {
         it('should group results by month correctly parsing metrics explicitly', async () => {
              const d1 = new Date('2025-03-01T10:00:00Z');
              const d2 = new Date('2025-03-15T10:00:00Z');
              const d3 = new Date('2025-02-01T10:00:00Z');

              mockPrisma.changeRequest.findMany.mockResolvedValue([
                  { createdAt: d1, status: 'EXECUTED', riskLevel: 'CRITICO' },
                  { createdAt: d2, status: 'FAILED', riskLevel: 'HIGH' },
                  { createdAt: d3, status: 'PENDING', riskLevel: 'LOW' }
              ]);

              const trends = await ChangeMetricsService.getTrends(mockPrisma, 'u1');
              
              // 2025-03
              const marchTrend = trends.find(t => t.month === '2025-03');
              expect(marchTrend.total).toBe(2);
              expect(marchTrend.executed).toBe(1);
              expect(marchTrend.failed).toBe(1);
              expect(marchTrend.critico).toBe(1);
              expect(marchTrend.successRate).toBe("50.0"); // 1/2
              
              // 2025-02
              const febTrend = trends.find(t => t.month === '2025-02');
              expect(febTrend.total).toBe(1);
              expect(febTrend.executed).toBe(0);
              expect(febTrend.successRate).toBe(100);
         });
    });
});
