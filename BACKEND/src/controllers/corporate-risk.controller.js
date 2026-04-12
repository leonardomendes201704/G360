const CorporateRiskService = require('../services/corporate-risk.service');
const logger = require('../config/logger');

exports.create = async (req, res) => {
    try {
        const risk = await CorporateRiskService.create(req.prisma, req.body, req.user.userId);
        res.status(201).json(risk);
    } catch (error) {
        logger.error('Error creating risk:', error);
        res.status(error.statusCode || 500).json({ message: error.message || 'Error creating risk' });
    }
};

exports.findAll = async (req, res) => {
    try {
        // Passar userId para aplicar filtro de escopo por centro de custo
        const risks = await CorporateRiskService.findAll(req.prisma, req.query, req.user.userId);
        res.json(risks);
    } catch (error) {
        logger.error('Error fetching risks:', error);
        res.status(error.statusCode || 500).json({ message: error.message || 'Error fetching risks' });
    }
};

exports.findById = async (req, res) => {
    try {
        // Passar userId para verificar acesso
        const risk = await CorporateRiskService.findById(req.prisma, req.params.id, req.user.userId);
        if (!risk) return res.status(404).json({ message: 'Risk not found' });
        res.json(risk);
    } catch (error) {
        res.status(error.statusCode || 500).json({ message: error.message || 'Error fetching risk details' });
    }
};

exports.update = async (req, res) => {
    try {
        // Passar userId para verificar acesso
        const risk = await CorporateRiskService.update(req.prisma, req.params.id, req.body, req.user.userId);
        res.json(risk);
    } catch (error) {
        res.status(error.statusCode || 500).json({ message: error.message || 'Error updating risk' });
    }
};

exports.delete = async (req, res) => {
    try {
        // Passar userId para verificar acesso
        await CorporateRiskService.delete(req.prisma, req.params.id, req.user.userId);
        res.status(204).send();
    } catch (error) {
        res.status(error.statusCode || 500).json({ message: error.message || 'Error deleting risk' });
    }
};

exports.getHeatmap = async (req, res) => {
    try {
        // Passar userId para aplicar filtro de escopo no heatmap
        const data = await CorporateRiskService.getHeatmapMetrics(req.prisma, req.user.userId);
        res.json(data);
    } catch (error) {
        res.status(error.statusCode || 500).json({ message: error.message || 'Error fetching heatmap' });
    }
}
