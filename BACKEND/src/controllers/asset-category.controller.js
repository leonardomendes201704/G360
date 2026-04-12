const AssetCategoryService = require('../services/asset-category.service');
const yup = require('yup');

class AssetCategoryController {
  static async create(req, res) {
    try {
      const schema = yup.object().shape({
        name: yup.string().required('Nome da categoria é obrigatório'),
        type: yup.string().oneOf(['HARDWARE', 'SOFTWARE']).required('Tipo é obrigatório'),
        depreciationYears: yup.number().nullable()
      });

      await schema.validate(req.body);
      const category = await AssetCategoryService.create(req.prisma, req.body);
      return res.status(201).json(category);
    } catch (error) {
      if (error.name === 'ValidationError') return res.status(400).json({ error: error.message });
      throw error;
    }
  }

  static async index(req, res) {
    const categories = await AssetCategoryService.getAll(req.prisma);
    return res.status(200).json(categories);
  }

  static async update(req, res) {
    const { id } = req.params;
    const category = await AssetCategoryService.update(req.prisma, id, req.body);
    return res.status(200).json(category);
  }

  static async delete(req, res) {
    const { id } = req.params;
    await AssetCategoryService.delete(req.prisma, id);
    return res.status(204).send();
  }
}

module.exports = AssetCategoryController;