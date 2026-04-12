const ChangeTemplateService = require('../services/change-template.service');

class ChangeTemplateController {
    static async index(req, res) {
        const templates = await ChangeTemplateService.getAll(req.prisma, req.user.userId);
        return res.status(200).json(templates);
    }

    static async show(req, res) {
        const { id } = req.params;
        const template = await ChangeTemplateService.getById(req.prisma, id, req.user.userId);
        return res.status(200).json(template);
    }

    static async create(req, res) {
        const { userId } = req.user;
        const template = await ChangeTemplateService.create(req.prisma, userId, req.body);
        return res.status(201).json(template);
    }

    static async update(req, res) {
        const { id } = req.params;
        const template = await ChangeTemplateService.update(req.prisma, id, req.body, req.user.userId);
        return res.status(200).json(template);
    }

    static async delete(req, res) {
        const { id } = req.params;
        await ChangeTemplateService.delete(req.prisma, id, req.user.userId);
        return res.status(204).send();
    }

    static async apply(req, res) {
        const { id } = req.params;
        const gmudData = await ChangeTemplateService.applyTemplate(req.prisma, id, req.user.userId);
        return res.status(200).json(gmudData);
    }
}

module.exports = ChangeTemplateController;
