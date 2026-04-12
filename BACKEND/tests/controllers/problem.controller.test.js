const ProblemController = require('../../src/controllers/problem.controller');
const ProblemService = require('../../src/services/problem.service');

jest.mock('../../src/services/problem.service');

describe('ProblemController', () => {
    let req, res;

    beforeEach(() => {
        jest.clearAllMocks();
        req = {
            prisma: {},
            query: {},
            params: {},
            body: {},
            user: { userId: 'u1' }
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };
    });

    describe('index', () => {
        it('should return 200 and all problems on valid fetching', async () => {
            ProblemService.getAll.mockResolvedValue([{ id: 'p1' }]);
            await ProblemController.index(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith([{ id: 'p1' }]);
        });

        it('should return 500 on service error', async () => {
            ProblemService.getAll.mockRejectedValue(new Error('DB Error'));
            await ProblemController.index(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ error: 'DB Error' });
        });
    });

    describe('show', () => {
        it('should return 200 and specific problem', async () => {
            req.params.id = 'p1';
            ProblemService.getById.mockResolvedValue({ id: 'p1' });
            await ProblemController.show(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({ id: 'p1' });
        });

        it('should return 404 when problem not found', async () => {
            req.params.id = 'p99';
            ProblemService.getById.mockRejectedValue(new Error('Problema não encontrado'));
            await ProblemController.show(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({ error: 'Problema não encontrado' });
        });
    });

    describe('create', () => {
        it('should successfully validate payload and call service.create with status 201', async () => {
            req.body = { title: 'Downtime', description: 'Network is down' }; // Valid payload
            ProblemService.create.mockResolvedValue({ id: 'p1', ...req.body });

            await ProblemController.create(req, res);

            expect(ProblemService.create).toHaveBeenCalledWith(req.prisma, { 
                title: 'Downtime', 
                description: 'Network is down', 
                priority: 'HIGH', // Defaults correctly 
                requesterId: 'u1' 
            });
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ id: 'p1' }));
        });

        it('should return 400 when payload validation fails (missing description)', async () => {
            req.body = { title: 'Downtime' }; // Invalid payload
            
            await ProblemController.create(req, res);
            
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ error: 'Descrição é obrigatória' }); // Yup required message
            expect(ProblemService.create).not.toHaveBeenCalled();
        });

        it('should return 400 on service throw', async () => {
            req.body = { title: 'Downtime', description: 'desc' };
            ProblemService.create.mockRejectedValue(new Error('Unexpected create error'));
            
            await ProblemController.create(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });
    });

    describe('updateStatus', () => {
        it('should successfully call service.updateStatus and return 200', async () => {
            req.params.id = 'p1';
            req.body = { status: 'IDENTIFIED', rootCause: 'Bug', workaround: 'Restart' };
            ProblemService.updateStatus.mockResolvedValue({ id: 'p1', status: 'IDENTIFIED' });

            await ProblemController.updateStatus(req, res);

            expect(ProblemService.updateStatus).toHaveBeenCalledWith(req.prisma, 'p1', 'IDENTIFIED', 'Bug', 'Restart');
            expect(res.status).toHaveBeenCalledWith(200);
        });

        it('should return 400 on unexpected issue in update', async () => {
            ProblemService.updateStatus.mockRejectedValue(new Error('Failed update'));
            await ProblemController.updateStatus(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ error: 'Failed update' });
        });
    });

    describe('linkIncident', () => {
        it('should successfully link ticket returning 200', async () => {
            req.params.id = 'p1';
            req.body = { ticketId: 't1' };
            ProblemService.linkIncident.mockResolvedValue(true);

            await ProblemController.linkIncident(req, res);

            expect(ProblemService.linkIncident).toHaveBeenCalledWith(req.prisma, 'p1', 't1');
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({ message: 'Incidente vinculado com sucesso.' });
        });

        it('should return 400 if ticketId is missed', async () => {
            req.params.id = 'p1';
            req.body = {};

            await ProblemController.linkIncident(req, res);
            
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ error: 'ticketId é obrigatório' });
        });

        it('should return 400 on unexpected issue in link', async () => {
            req.body = { ticketId: 't1' };
            ProblemService.linkIncident.mockRejectedValue(new Error('Failed binding'));
            await ProblemController.linkIncident(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ error: 'Failed binding' });
        });
    });
});
