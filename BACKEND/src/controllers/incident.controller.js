const IncidentService = require('../services/incident.service');

class IncidentController {
    // GET /api/incidents
    static async index(req, res, next) {
        try {
            const filters = {
                status: req.query.status,
                priority: req.query.priority,
                categoryId: req.query.categoryId,
                assigneeId: req.query.assigneeId,
                reporterId: req.query.reporterId,
                search: req.query.search,
                dateFrom: req.query.dateFrom,
                dateTo: req.query.dateTo,
                slaBreached: req.query.slaBreached === 'true' ? true : undefined
            };

            const incidents = await IncidentService.getAll(req.prisma, filters, req.user.userId);
            res.json(incidents);
        } catch (error) {
            next(error);
        }
    }

    // GET /api/incidents/kpis
    static async getKPIs(req, res, next) {
        try {
            const kpis = await IncidentService.getKPIs(req.prisma, req.user.userId);
            res.json(kpis);
        } catch (error) {
            next(error);
        }
    }

    // GET /api/incidents/categories
    static async getCategories(req, res, next) {
        try {
            const activeOnly = req.query.all !== 'true';
            const categories = await IncidentService.getCategories(req.prisma, activeOnly);
            res.json(categories);
        } catch (error) {
            next(error);
        }
    }

    // POST /api/incidents/categories
    static async createCategory(req, res, next) {
        try {
            const category = await IncidentService.createCategory(req.prisma, req.body);
            res.status(201).json(category);
        } catch (error) {
            next(error);
        }
    }

    // PUT /api/incidents/categories/:id
    static async updateCategory(req, res, next) {
        try {
            const category = await IncidentService.updateCategory(req.prisma, req.params.id, req.body);
            res.json(category);
        } catch (error) {
            next(error);
        }
    }

    // POST /api/incidents
    static async create(req, res, next) {
        try {
            const incident = await IncidentService.create(req.prisma, req.user.userId, req.body);
            res.status(201).json(incident);
        } catch (error) {
            next(error);
        }
    }

    // GET /api/incidents/:id
    static async show(req, res, next) {
        try {
            const incident = await IncidentService.getById(req.prisma, req.params.id, req.user.userId);
            res.json(incident);
        } catch (error) {
            next(error);
        }
    }

    // PUT /api/incidents/:id
    static async update(req, res, next) {
        try {
            const incident = await IncidentService.update(req.prisma, req.params.id,
                req.user.userId,
                req.body
            );
            res.json(incident);
        } catch (error) {
            next(error);
        }
    }

    // DELETE /api/incidents/:id
    static async destroy(req, res, next) {
        try {
            const result = await IncidentService.delete(req.prisma, req.params.id,
                req.user.userId
            );
            res.json(result);
        } catch (error) {
            next(error);
        }
    }

    // POST /api/incidents/:id/assign
    static async assign(req, res, next) {
        try {
            const { assigneeId } = req.body;
            if (!assigneeId) {
                return res.status(400).json({ message: 'assigneeId é obrigatório.' });
            }

            const incident = await IncidentService.assign(req.prisma, req.params.id,
                assigneeId,
                req.user.userId
            );
            res.json(incident);
        } catch (error) {
            next(error);
        }
    }

    // POST /api/incidents/:id/resolve
    static async resolve(req, res, next) {
        try {
            const { solution, rootCause } = req.body;
            const incident = await IncidentService.resolve(req.prisma, req.params.id,
                req.user.userId,
                solution,
                rootCause
            );
            res.json(incident);
        } catch (error) {
            next(error);
        }
    }

    // POST /api/incidents/:id/close
    static async close(req, res, next) {
        try {
            const incident = await IncidentService.close(req.prisma, req.params.id,
                req.user.userId
            );
            res.json(incident);
        } catch (error) {
            next(error);
        }
    }

    // POST /api/incidents/:id/escalate
    static async escalate(req, res, next) {
        try {
            const { reason } = req.body;
            const result = await IncidentService.escalate(req.prisma, req.params.id,
                req.user.userId,
                reason
            );
            res.json(result);
        } catch (error) {
            next(error);
        }
    }

    // POST /api/incidents/:id/comments
    static async addComment(req, res, next) {
        try {
            const { content, isInternal } = req.body;
            if (!content) {
                return res.status(400).json({ message: 'Conteúdo do comentário é obrigatório.' });
            }

            const comment = await IncidentService.addComment(req.prisma, req.params.id,
                req.user.userId,
                content,
                isInternal === true
            );
            res.status(201).json(comment);
        } catch (error) {
            next(error);
        }
    }

    // GET /api/incidents/:id/comments
    static async getComments(req, res, next) {
        try {
            const comments = await IncidentService.getComments(req.prisma, req.params.id, req.user.userId);
            res.json(comments);
        } catch (error) {
            next(error);
        }
    }

    // GET /api/incidents/:id/history
    static async getHistory(req, res, next) {
        try {
            const history = await IncidentService.getHistory(req.prisma, req.params.id, req.user.userId);
            res.json(history);
        } catch (error) {
            next(error);
        }
    }

    // POST /api/incidents/:id/attachments
    static async uploadAttachment(req, res, next) {
        try {
            if (!req.file) {
                return res.status(400).json({ message: 'Arquivo não enviado.' });
            }

            const attachment = await IncidentService.addAttachment(req.prisma, req.params.id,
                req.user.userId,
                req.file
            );

            res.status(201).json(attachment);
        } catch (error) {
            next(error);
        }
    }

    // GET /api/incidents/:id/attachments
    static async getAttachments(req, res, next) {
        try {
            const attachments = await IncidentService.getAttachments(req.prisma, req.params.id, req.user.userId);
            res.json(attachments);
        } catch (error) {
            next(error);
        }
    }

    // DELETE /api/incidents/attachments/:id
    static async deleteAttachment(req, res, next) {
        try {
            await IncidentService.deleteAttachment(req.prisma, req.params.id, req.user.userId);
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    }
}

module.exports = IncidentController;
