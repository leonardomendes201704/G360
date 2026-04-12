const KnowledgeBaseService = require('../services/knowledge-base.service');
const path = require('path');
const fs = require('fs');
const logger = require('../config/logger');

class KnowledgeBaseController {

    static async create(req, res) {
        try {
            const { userId } = req.user;
            const file = req.file;

            // Normalize URL if file exists
            if (file) {
                const uploadsRoot = path.resolve(__dirname, '..', '..');
                const relativePath = path.relative(uploadsRoot, file.path);
                // Ensure forward slashes for URL
                file.path = `/${relativePath.split(path.sep).join('/')}`;
            }

            const article = await KnowledgeBaseService.create(req.prisma, req.body, userId, file);
            return res.status(201).json(article);
        } catch (error) {
            logger.error(error);
            return res.status(500).json({ error: 'Erro ao criar artigo.', details: error.message });
        }
    }

    static async update(req, res) {
        try {
            const { id } = req.params;
            const article = await KnowledgeBaseService.update(req.prisma, id, req.body, req.user.userId);
            return res.status(200).json(article);
        } catch (error) {
            return res.status(500).json({ error: 'Erro ao atualizar artigo.', details: error.message });
        }
    }

    static async delete(req, res) {
        try {
            const { id } = req.params;

            // Ideally we should find the article first to get file paths and delete them from disk
            const article = await KnowledgeBaseService.findById(req.prisma, id, req.user.userId);

            if (article && article.attachments && article.attachments.length > 0) {
                article.attachments.forEach(att => {
                    try {
                        // Construct absolute path. att.fileUrl is relative like '/uploads/knowledge/...'
                        const absolutePath = path.join(__dirname, '..', '..', att.fileUrl);
                        if (fs.existsSync(absolutePath)) {
                            fs.unlinkSync(absolutePath);
                        }
                    } catch (err) {
                        logger.error('Failed to delete physical file:', err);
                    }
                });
            }

            await KnowledgeBaseService.delete(req.prisma, id, req.user.userId);
            return res.status(204).send();
        } catch (error) {
            return res.status(500).json({ error: 'Erro ao remover artigo.', details: error.message });
        }
    }

    static async index(req, res) {
        try {
            const articles = await KnowledgeBaseService.findAll(req.prisma, req.query, req.user.userId);
            return res.status(200).json(articles);
        } catch (error) {
            return res.status(500).json({ error: 'Erro ao listar artigos.', details: error.message });
        }
    }

    static async show(req, res) {
        try {
            const { id } = req.params;
            const article = await KnowledgeBaseService.findById(req.prisma, id, req.user.userId);
            if (!article) return res.status(404).json({ message: 'Artigo não encontrado' });
            return res.status(200).json(article);
        } catch (error) {
            return res.status(500).json({ error: 'Erro ao obter artigo.', details: error.message });
        }
    }

    static async getDashboardStats(req, res) {
        try {
            const stats = await KnowledgeBaseService.getDashboardStats(req.prisma, req.user.userId);
            return res.status(200).json(stats);
        } catch (error) {
            return res.status(500).json({ error: 'Erro ao obter estatísticas.', details: error.message });
        }
    }
}

module.exports = KnowledgeBaseController;

