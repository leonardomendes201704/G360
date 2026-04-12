const KnowledgeCategoryService = require('../services/knowledge-category.service');
const logger = require('../config/logger');

class KnowledgeCategoryController {

    static async create(req, res) {
        try {
            const category = await KnowledgeCategoryService.create(req.prisma, req.body);
            return res.status(201).json(category);
        } catch (error) {
            logger.error(error);
            if (error.code === 'P2002') {
                return res.status(400).json({ error: 'Categoria já existe.' });
            }
            return res.status(500).json({ error: 'Erro ao criar categoria.', details: error.message });
        }
    }

    static async update(req, res) {
        try {
            const { id } = req.params;
            const category = await KnowledgeCategoryService.update(req.prisma, id, req.body);
            return res.status(200).json(category);
        } catch (error) {
            logger.error(error);
            return res.status(500).json({ error: 'Erro ao atualizar categoria.', details: error.message });
        }
    }

    static async delete(req, res) {
        try {
            const { id } = req.params;
            await KnowledgeCategoryService.delete(req.prisma, id);
            return res.status(204).send();
        } catch (error) {
            logger.error(error);
            return res.status(500).json({ error: 'Erro ao remover categoria.', details: error.message });
        }
    }

    static async index(req, res) {
        try {
            const includeInactive = req.query.includeInactive === 'true';
            const categories = await KnowledgeCategoryService.findAll(req.prisma, includeInactive);
            return res.status(200).json(categories);
        } catch (error) {
            logger.error(error);
            return res.status(500).json({ error: 'Erro ao listar categorias.', details: error.message });
        }
    }

    static async show(req, res) {
        try {
            const { id } = req.params;
            const category = await KnowledgeCategoryService.findById(req.prisma, id);
            if (!category) return res.status(404).json({ message: 'Categoria não encontrada' });
            return res.status(200).json(category);
        } catch (error) {
            logger.error(error);
            return res.status(500).json({ error: 'Erro ao obter categoria.', details: error.message });
        }
    }

    static async seedDefaults(req, res) {
        try {
            const categories = await KnowledgeCategoryService.seedDefaults(req.prisma);
            return res.status(200).json({ message: 'Categorias padrão criadas.', categories });
        } catch (error) {
            logger.error(error);
            return res.status(500).json({ error: 'Erro ao criar categorias padrão.', details: error.message });
        }
    }
}

module.exports = KnowledgeCategoryController;
