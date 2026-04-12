const FreezeWindowService = require('../services/freeze-window.service');

exports.create = async (req, res) => {
    try {
        const data = { ...req.body, createdBy: req.user.userId };
        const window = await FreezeWindowService.create(req.prisma, data);
        res.status(201).json(window);
    } catch (error) {
        res.status(error.statusCode || 500).json({ message: error.message });
    }
};

exports.getAll = async (req, res) => {
    try {
        const { activeOnly } = req.query;
        const windows = await FreezeWindowService.getAll(req.prisma, activeOnly === 'true');
        res.json(windows);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.update = async (req, res) => {
    try {
        const window = await FreezeWindowService.update(req.prisma, req.params.id, req.body);
        res.json(window);
    } catch (error) {
        res.status(error.statusCode || 500).json({ message: error.message });
    }
};

exports.delete = async (req, res) => {
    try {
        await FreezeWindowService.delete(req.prisma, req.params.id);
        res.status(204).send();
    } catch (error) {
        res.status(error.statusCode || 500).json({ message: error.message });
    }
};
