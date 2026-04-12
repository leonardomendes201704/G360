const KnowledgeCategoryRepository = require('../repositories/knowledge-category.repository');

class KnowledgeCategoryService {
    static async create(prisma, data) {
        const { name, description, color, icon } = data;
        return await KnowledgeCategoryRepository.create(prisma, {
            name,
            description,
            color: color || '#6366f1',
            icon: icon || 'folder'
        });
    }

    static async update(prisma, id, data) {
        const { name, description, color, icon, isActive } = data;
        return await KnowledgeCategoryRepository.update(prisma, id, {
            name,
            description,
            color,
            icon,
            isActive: isActive === undefined ? undefined : Boolean(isActive)
        });
    }

    static async delete(prisma, id) {
        const category = await KnowledgeCategoryRepository.findById(prisma, id);

        if (category?.articles?.length > 0 || category?._count?.articles > 0) {
            return await KnowledgeCategoryRepository.update(prisma, id, { isActive: false });
        }

        return await KnowledgeCategoryRepository.delete(prisma, id);
    }

    static async findAll(prisma, includeInactive = false) {
        const where = includeInactive ? {} : { isActive: true };
        return await KnowledgeCategoryRepository.findAll(prisma, where);
    }

    static async findById(prisma, id) {
        return await KnowledgeCategoryRepository.findById(prisma, id);
    }

    static async seedDefaults(prisma) {
        const defaults = [
            { name: 'Geral', color: '#6b7280', icon: 'folder' },
            { name: 'RH', color: '#10b981', icon: 'people' },
            { name: 'TI', color: '#6366f1', icon: 'computer' },
            { name: 'Financeiro', color: '#f59e0b', icon: 'payments' },
            { name: 'Jurídico', color: '#ef4444', icon: 'gavel' },
            { name: 'Processos', color: '#8b5cf6', icon: 'settings' },
            { name: 'Vendas', color: '#14b8a6', icon: 'storefront' }
        ];

        for (const cat of defaults) {
            await KnowledgeCategoryRepository.upsertByName(prisma, cat.name, cat);
        }

        return await this.findAll(prisma);
    }
}

module.exports = KnowledgeCategoryService;
