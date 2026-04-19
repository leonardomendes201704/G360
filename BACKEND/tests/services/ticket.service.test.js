const TicketService = require('../../src/services/ticket.service');
const MailService = require('../../src/services/mail.service');
const EmailTemplateService = require('../../src/services/email-template.service');

jest.mock('../../src/services/mail.service');
jest.mock('../../src/services/email-template.service');
jest.spyOn(console, 'error').mockImplementation(() => {});

describe('TicketService', () => {
    let mockPrisma;

    beforeEach(() => {
        mockPrisma = {
            $queryRaw: jest.fn().mockResolvedValue([{ lastNumber: 6 }]),
            user: {
                findUnique: jest.fn().mockResolvedValue({ departmentId: null, costCenterId: null }),
            },
            helpdeskConfig: {
                findUnique: jest.fn().mockResolvedValue({
                    id: 1,
                    useBusinessCalendar: false,
                    calendar: {}
                }),
                upsert: jest.fn(),
                create: jest.fn()
            },
            supportGroup: {
                findUnique: jest.fn()
            },
            ticket: {
                create: jest.fn(),
                findMany: jest.fn(),
                findUnique: jest.fn(),
                update: jest.fn()
            },
            ticketMessage: {
                create: jest.fn()
            },
            serviceCatalog: {
                findUnique: jest.fn()
            },
            problemRequest: {
                count: jest.fn(),
                create: jest.fn()
            },
            changeRequest: {
                count: jest.fn(),
                create: jest.fn()
            },
            project: {
                count: jest.fn(),
                create: jest.fn()
            }
        };

        EmailTemplateService.getTicketCreatedTemplate = jest.fn().mockReturnValue('<html></html>');
        EmailTemplateService.getTicketMessageTemplate = jest.fn().mockReturnValue('<html></html>');
        EmailTemplateService.getTicketUpdateTemplate = jest.fn().mockReturnValue('<html></html>');
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('create', () => {
        const data = { title: 'T', description: 'D', categoryId: 'C1', requesterId: 'U1' };

        it('should create a ticket with sequential code and SLA fields', async () => {
            const yy = String(new Date().getFullYear()).slice(-2);
            mockPrisma.ticket.create.mockResolvedValue({
                id: 't1',
                code: `HD${yy}0006`,
                title: 'T',
                slaResponseDue: new Date(),
                slaResolveDue: new Date()
            });

            const res = await TicketService.create(mockPrisma, data);

            expect(mockPrisma.$queryRaw).toHaveBeenCalled();
            expect(mockPrisma.ticket.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        code: expect.stringMatching(new RegExp(`^HD${yy}0006$`)),
                        priority: 'MEDIUM',
                        slaResponseDue: expect.any(Date),
                        slaResolveDue: expect.any(Date)
                    })
                })
            );
            expect(res.id).toBe('t1');
            expect(MailService.sendMail).not.toHaveBeenCalled();
        });

        it('should send email if requester info exists', async () => {
            mockPrisma.ticket.create.mockResolvedValue({
                id: 't1',
                code: 'C',
                title: 'T',
                requester: { email: 'a@b.com', name: 'User' }
            });
            EmailTemplateService.getTicketCreatedTemplate.mockReturnValue('<html/>');

            await TicketService.create(mockPrisma, data);
            expect(MailService.sendMail).toHaveBeenCalledWith(
                mockPrisma,
                expect.objectContaining({
                    to: 'a@b.com',
                    type: 'TICKET_CREATED'
                })
            );
        });

        it('should handle mail errors gracefully without throwing', async () => {
            mockPrisma.ticket.create.mockResolvedValue({
                id: '1',
                requester: { email: 'e', name: 'N' }
            });
            MailService.sendMail.mockRejectedValue(new Error('Mail down'));

            const res = await TicketService.create(mockPrisma, data);
            expect(res.id).toBe('1');
        });
    });

    describe('getAll', () => {
        it('should apply role-based and query filters', async () => {
            mockPrisma.ticket.findMany.mockResolvedValue(['t1']);
            await TicketService.getAll(mockPrisma, { status: 'OPEN', priority: 'HIGH', assigneeId: 'a1' }, 'u1', 'REQUESTER');

            const calledWhere = mockPrisma.ticket.findMany.mock.calls[0][0].where;
            expect(calledWhere.AND).toEqual(
                expect.arrayContaining([
                    { requesterId: 'u1' },
                    { status: 'OPEN' },
                    { priority: 'HIGH' },
                    { assigneeId: 'a1' }
                ])
            );
        });

        it('should not filter by requester for ADMIN', async () => {
            await TicketService.getAll(mockPrisma, {}, 'u1', 'ADMIN');
            const calledWhere = mockPrisma.ticket.findMany.mock.calls[0][0].where;
            expect(calledWhere.requesterId).toBeUndefined();
        });
    });

    describe('getById', () => {
        it('should throw if not found', async () => {
            mockPrisma.ticket.findUnique.mockResolvedValue(null);
            await expect(TicketService.getById(mockPrisma, '1')).rejects.toThrow('Ticket não encontrado');
        });

        it('should return ticket if found', async () => {
            mockPrisma.ticket.findUnique.mockResolvedValue({ id: '1' });
            const res = await TicketService.getById(mockPrisma, '1');
            expect(res.id).toBe('1');
        });
    });

    describe('updateStatus', () => {
        it('should throw if not found', async () => {
            mockPrisma.ticket.findUnique.mockResolvedValue(null);
            await expect(TicketService.updateStatus(mockPrisma, '1', 'WAITING_USER', { assigneeId: 'a1' })).rejects.toThrow(
                'Ticket não encontrado'
            );
        });

        it('should set resolvedAt if status is RESOLVED or CLOSED', async () => {
            mockPrisma.ticket.findUnique.mockResolvedValue({ id: '1', status: 'OPEN' });
            mockPrisma.ticket.update.mockImplementation((opts) => ({ ...opts.data, ...opts.include }));

            const res = await TicketService.updateStatus(mockPrisma, '1', 'RESOLVED', {});
            expect(res.resolvedAt).toBeInstanceOf(Date);
        });

        it('should pause SLA when transitioning to WAITING_USER', async () => {
            mockPrisma.ticket.findUnique.mockResolvedValue({ id: '1', status: 'OPEN' });
            mockPrisma.ticket.update.mockImplementation((opts) => opts.data);

            const res = await TicketService.updateStatus(mockPrisma, '1', 'WAITING_USER', {});
            expect(res.slaPausedAt).toBeInstanceOf(Date);
        });

        it('should resume SLA calculating paused duration when transitioning out of WAITING_USER', async () => {
            const pastDate = new Date(Date.now() - 600000);
            mockPrisma.ticket.findUnique.mockResolvedValue({
                id: '1',
                status: 'WAITING_USER',
                slaPausedAt: pastDate,
                slaTotalPausedMinutes: 5,
                slaResponseDue: new Date(),
                slaResolveDue: new Date()
            });
            mockPrisma.ticket.update.mockImplementation((opts) => opts.data);

            const res = await TicketService.updateStatus(mockPrisma, '1', 'IN_PROGRESS', {});
            expect(res.slaTotalPausedMinutes).toBeGreaterThanOrEqual(14);
            expect(res.slaPausedAt).toBeNull();
            expect(res.slaResponseDue.getTime()).toBeGreaterThan(Date.now() - 1000);
        });

        it('should handle transition out of WAITING_USER with no previous pause data', async () => {
            mockPrisma.ticket.findUnique.mockResolvedValue({ id: '1', status: 'WAITING_USER', slaPausedAt: null });
            mockPrisma.ticket.update.mockImplementation((opts) => opts.data);
            const res = await TicketService.updateStatus(mockPrisma, '1', 'IN_PROGRESS', {});
            expect(res.slaPausedAt).toBeUndefined();
        });

        it('should send summary email logic properly', async () => {
            mockPrisma.ticket.findUnique.mockResolvedValue({ id: '1', status: 'OPEN' });
            mockPrisma.ticket.update.mockResolvedValue({
                id: '1',
                requester: { email: 'a@b.com', name: 'User' }
            });
            await TicketService.updateStatus(mockPrisma, '1', 'IN_PROGRESS', {});
            expect(MailService.sendMail).toHaveBeenCalled();
        });

        it('should catch mail error on update status', async () => {
            mockPrisma.ticket.findUnique.mockResolvedValue({ id: '1' });
            mockPrisma.ticket.update.mockResolvedValue({ id: '1', requester: { email: 'e', name: 'n' } });
            MailService.sendMail.mockRejectedValue(new Error('fail'));
            const res = await TicketService.updateStatus(mockPrisma, '1', 'IN_PROGRESS', {});
            expect(res.id).toBe('1');
        });

        it('should persist assigneeId when provided', async () => {
            mockPrisma.ticket.findUnique.mockResolvedValue({ id: '1', status: 'OPEN' });
            mockPrisma.ticket.update.mockImplementation((opts) => opts.data);
            const res = await TicketService.updateStatus(mockPrisma, '1', 'IN_PROGRESS', { assigneeId: 'agent-1' });
            expect(res.assigneeId).toBe('agent-1');
        });
    });

    describe('addMessage', () => {
        const ticketPreview = {
            id: 't1',
            requesterId: 'req1',
            assigneeId: null,
            status: 'OPEN',
            respondedAt: null,
            code: `HD${String(new Date().getFullYear()).slice(-2)}0001`
        };

        beforeEach(() => {
            mockPrisma.ticket.findUnique.mockResolvedValue(ticketPreview);
        });

        it('should format attachments payload and save message', async () => {
            mockPrisma.ticketMessage.create.mockResolvedValue({ id: 'm1' });
            const atts = [{ fileName: 'f.txt', fileUrl: 'http', size: 10, mimetype: 'text/plain' }];
            await TicketService.addMessage(mockPrisma, 't1', 'u1', 'Hello', false, atts);

            expect(mockPrisma.ticketMessage.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        attachments: {
                            create: [
                                {
                                    ticketId: 't1',
                                    fileName: 'f.txt',
                                    fileUrl: 'http',
                                    fileSize: 10,
                                    mimeType: 'text/plain',
                                    uploadedBy: 'u1'
                                }
                            ]
                        }
                    })
                })
            );
        });

        it('should auto-resume ticket if requester replies while WAITING_USER', async () => {
            mockPrisma.ticket.findUnique.mockResolvedValue({
                ...ticketPreview,
                status: 'WAITING_USER'
            });
            const mockMsg = {
                id: 'm1',
                ticket: { id: 't1', requesterId: 'req1', status: 'WAITING_USER' }
            };
            mockPrisma.ticketMessage.create.mockResolvedValue(mockMsg);

            jest.spyOn(TicketService, 'updateStatus').mockResolvedValue(true);

            await TicketService.addMessage(mockPrisma, 't1', 'req1', 'Content', false, []);
            expect(TicketService.updateStatus).toHaveBeenCalledWith(mockPrisma, 't1', 'IN_PROGRESS', {});

            TicketService.updateStatus.mockRestore();
        });

        it('should send email to requester if an agent comments', async () => {
            const mockMsg = {
                id: 'm1',
                ticket: { id: 't1', requesterId: 'req1', status: 'OPEN', requester: { name: 'A', email: 'req@m.com' } }
            };
            mockPrisma.ticketMessage.create.mockResolvedValue(mockMsg);

            await TicketService.addMessage(mockPrisma, 't1', 'agent1', 'Content', false, []);
            expect(MailService.sendMail).toHaveBeenCalledWith(
                mockPrisma,
                expect.objectContaining({
                    to: 'req@m.com',
                    type: 'TICKET_MESSAGE'
                })
            );
        });

        it('should not throw on mail error during comment notification', async () => {
            const mockMsg = { ticket: { requesterId: 'r', requester: { email: 'e', name: 'n' } } };
            mockPrisma.ticketMessage.create.mockResolvedValue(mockMsg);
            MailService.sendMail.mockRejectedValue(new Error('fail'));
            const res = await TicketService.addMessage(mockPrisma, 't1', 'a1', 'Content');
            expect(res).toBeDefined();
        });
    });

    describe('escalations', () => {
        beforeEach(() => {
            jest.spyOn(TicketService, 'addMessage').mockResolvedValue(true);
        });
        afterEach(() => {
            TicketService.addMessage.mockRestore();
        });

        describe('escalateToProblem', () => {
            it('should throw if not found', async () => {
                mockPrisma.ticket.findUnique.mockResolvedValue(null);
                await expect(TicketService.escalateToProblem(mockPrisma, '1', 'u1')).rejects.toThrow('Chamado não encontrado');
            });
            it('should throw if already linked', async () => {
                mockPrisma.ticket.findUnique.mockResolvedValue({ id: '1', problemId: 'p1' });
                await expect(TicketService.escalateToProblem(mockPrisma, '1', 'u1')).rejects.toThrow('vinculado a um Problema');
            });
            it('should create problem, link it, and add internal message', async () => {
                mockPrisma.ticket.findUnique.mockResolvedValue({ id: '1', priority: 'URGENT', title: 'T', description: 'D' });
                mockPrisma.problemRequest.count.mockResolvedValue(0);
                mockPrisma.problemRequest.create.mockResolvedValue({ id: 'p1', code: 'PRB-0001' });

                await TicketService.escalateToProblem(mockPrisma, '1', 'u1');
                expect(mockPrisma.problemRequest.create).toHaveBeenCalledWith(
                    expect.objectContaining({
                        data: expect.objectContaining({ priority: 'HIGH' })
                    })
                );
                expect(mockPrisma.ticket.update).toHaveBeenCalledWith({ where: { id: '1' }, data: { problemId: 'p1' } });
                expect(TicketService.addMessage).toHaveBeenCalled();
            });
        });

        describe('escalateToChange', () => {
            it('should throw if not found', async () => {
                mockPrisma.ticket.findUnique.mockResolvedValue(null);
                await expect(TicketService.escalateToChange(mockPrisma, '1', 'u1')).rejects.toThrow('Chamado não encontrado');
            });
            it('should throw if already linked', async () => {
                mockPrisma.ticket.findUnique.mockResolvedValue({ id: '1', linkedChangeId: 'c1' });
                await expect(TicketService.escalateToChange(mockPrisma, '1', 'u1')).rejects.toThrow('Mudança vinculada');
            });
            it('should create change, link it, and add internal message', async () => {
                mockPrisma.ticket.findUnique.mockResolvedValue({ id: '1', title: 'T', description: 'D' });
                mockPrisma.changeRequest.count.mockResolvedValue(0);
                mockPrisma.changeRequest.create.mockResolvedValue({ id: 'c1', code: 'CHG-code' });

                await TicketService.escalateToChange(mockPrisma, '1', 'u1');
                expect(mockPrisma.ticket.update).toHaveBeenCalledWith({ where: { id: '1' }, data: { linkedChangeId: 'c1' } });
                expect(TicketService.addMessage).toHaveBeenCalled();
            });
        });

        describe('escalateToProject', () => {
            it('should throw if not found', async () => {
                mockPrisma.ticket.findUnique.mockResolvedValue(null);
                await expect(TicketService.escalateToProject(mockPrisma, '1', 'u1', 'N')).rejects.toThrow('Chamado não encontrado');
            });
            it('should throw if already linked', async () => {
                mockPrisma.ticket.findUnique.mockResolvedValue({ id: '1', linkedProjectId: 'p1' });
                await expect(TicketService.escalateToProject(mockPrisma, '1', 'u1', 'N')).rejects.toThrow('Projeto vinculado');
            });
            it('should create project, link it, and add internal message', async () => {
                mockPrisma.ticket.findUnique.mockResolvedValue({ id: '1', priority: 'LOW', title: 'T', description: 'D' });
                mockPrisma.project.count.mockResolvedValue(0);
                mockPrisma.project.create.mockResolvedValue({ id: 'p1', code: 'PRJ' });

                await TicketService.escalateToProject(mockPrisma, '1', 'u1');
                expect(mockPrisma.project.create).toHaveBeenCalledWith(
                    expect.objectContaining({
                        data: expect.objectContaining({ priority: 'MEDIUM', name: 'Demanda: T' })
                    })
                );
                expect(mockPrisma.ticket.update).toHaveBeenCalledWith({ where: { id: '1' }, data: { linkedProjectId: 'p1' } });
                expect(TicketService.addMessage).toHaveBeenCalled();
            });
        });
    });
});
