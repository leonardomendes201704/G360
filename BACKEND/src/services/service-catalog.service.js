const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class ServiceCatalogService {
  static async getAll(prismaClient, query) {
    let where = { isActive: true };
    if (query.categoryId) where.categoryId = query.categoryId;

    return await prismaClient.serviceCatalog.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        category: true,
        slaPolicy: true
      }
    });
  }

  static async getCategories(prismaClient) {
    return await prismaClient.ticketCategory.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' }
    });
  }

  static async createCategory(prismaClient, data) {
    const existing = await prismaClient.ticketCategory.findUnique({
      where: { name: data.name }
    });

    if (existing) {
      if (!existing.isActive) {
        // Soft delete conflict: reativar a categoria ocultada
        return await prismaClient.ticketCategory.update({
          where: { id: existing.id },
          data: { ...data, isActive: true }
        });
      } else {
        throw new Error(`Já existe uma Categoria ativa com o nome '${data.name}'.`);
      }
    }

    return await prismaClient.ticketCategory.create({ data });
  }

  static async updateCategory(prismaClient, id, data) {
    return await prismaClient.ticketCategory.update({ where: { id }, data });
  }

  static async deleteCategory(prismaClient, id) {
    // Para deleção, podemos fazer soft delete
    return await prismaClient.ticketCategory.update({ where: { id }, data: { isActive: false } });
  }

  static async createService(prismaClient, data) {
    return await prismaClient.serviceCatalog.create({ data });
  }

  static async updateService(prismaClient, id, data) {
    return await prismaClient.serviceCatalog.update({ where: { id }, data });
  }

  static async deleteService(prismaClient, id) {
    return await prismaClient.serviceCatalog.update({ where: { id }, data: { isActive: false } });
  }
}

module.exports = ServiceCatalogService;
