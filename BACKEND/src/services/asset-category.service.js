const AssetCategoryRepository = require('../repositories/asset-category.repository');

class AssetCategoryService {
  static async create(prisma, data) {
    // Simples criação, futuramente pode validar duplicidade de nome
    return AssetCategoryRepository.create(prisma, data);
  }

  static async getAll(prisma) {
    return AssetCategoryRepository.findAll(prisma);
  }

  static async update(prisma, id, data) {
    const category = await AssetCategoryRepository.findById(prisma, id);
    if (!category) {
      const error = new Error('Categoria não encontrada.');
      error.statusCode = 404;
      throw error;
    }
    return AssetCategoryRepository.update(prisma, id, data);
  }

  static async delete(prisma, id) {
    // TODO: Verificar se existem ativos vinculados antes de deletar
    const category = await AssetCategoryRepository.findById(prisma, id);
    if (!category) {
      const error = new Error('Categoria não encontrada.');
      error.statusCode = 404;
      throw error;
    }
    return AssetCategoryRepository.delete(prisma, id);
  }
}

module.exports = AssetCategoryService;