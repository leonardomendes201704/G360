const logger = require('../config/logger');

/**
 * TenantRepository — Operações CRUD no catálogo de tenants (schema public).
 * Usa $queryRaw pois o PrismaClient principal não tem o modelo Tenant.
 */
class TenantRepository {

    /**
     * Lista todos os tenants.
     */
    static async findAll(catalogPrisma) {
        return catalogPrisma.$queryRaw`
      SELECT id, name, slug, schema_name AS "schemaName",
             is_active AS "isActive", plan, max_users AS "maxUsers",
             enabled_modules AS "enabledModules",
             created_at AS "createdAt", updated_at AS "updatedAt"
      FROM tenants
      ORDER BY created_at DESC
    `;
    }

    /**
     * Busca tenant por ID.
     */
    static async findById(catalogPrisma, id) {
        const rows = await catalogPrisma.$queryRaw`
      SELECT id, name, slug, schema_name AS "schemaName",
             is_active AS "isActive", plan, max_users AS "maxUsers",
             enabled_modules AS "enabledModules",
             created_at AS "createdAt", updated_at AS "updatedAt"
      FROM tenants
      WHERE id = ${id}::uuid
      LIMIT 1
    `;
        return rows.length > 0 ? rows[0] : null;
    }

    /**
     * Busca tenant por slug.
     */
    static async findBySlug(catalogPrisma, slug) {
        const rows = await catalogPrisma.$queryRaw`
      SELECT id, name, slug, schema_name AS "schemaName",
             is_active AS "isActive", plan, max_users AS "maxUsers",
             enabled_modules AS "enabledModules",
             created_at AS "createdAt", updated_at AS "updatedAt"
      FROM tenants
      WHERE slug = ${slug}
      LIMIT 1
    `;
        return rows.length > 0 ? rows[0] : null;
    }

    /**
     * Busca tenant por schemaName.
     */
    static async findBySchemaName(catalogPrisma, schemaName) {
        const rows = await catalogPrisma.$queryRaw`
      SELECT id, name, slug, schema_name AS "schemaName",
             is_active AS "isActive", plan, max_users AS "maxUsers",
             enabled_modules AS "enabledModules",
             created_at AS "createdAt", updated_at AS "updatedAt"
      FROM tenants
      WHERE schema_name = ${schemaName}
      LIMIT 1
    `;
        return rows.length > 0 ? rows[0] : null;
    }

    /**
     * Cria novo tenant no catálogo.
     */
    static async create(catalogPrisma, { name, slug, schemaName, plan = 'STANDARD', maxUsers = 50 }) {
        const now = new Date();

        const rows = await catalogPrisma.$queryRaw`
      INSERT INTO tenants (id, name, slug, schema_name, is_active, plan, max_users, created_at, updated_at)
      VALUES (gen_random_uuid(), ${name}, ${slug}, ${schemaName}, true, ${plan}, ${maxUsers}, ${now}, ${now})
      RETURNING id, name, slug, schema_name AS "schemaName",
                is_active AS "isActive", plan, max_users AS "maxUsers",
                enabled_modules AS "enabledModules",
                created_at AS "createdAt", updated_at AS "updatedAt"
    `;

        return rows[0];
    }

    /**
     * Atualiza tenant.
     */
    static async update(catalogPrisma, id, data) {
        const now = new Date();
        const { name, plan, maxUsers, isActive, enabledModules } = data;

        // Build dynamic update — only supplied fields
        const sets = [];
        const values = [];

        if (name !== undefined) { sets.push('name'); values.push(name); }
        if (plan !== undefined) { sets.push('plan'); values.push(plan); }
        if (maxUsers !== undefined) { sets.push('max_users'); values.push(maxUsers); }
        if (isActive !== undefined) { sets.push('is_active'); values.push(isActive); }
        if (enabledModules !== undefined) { sets.push('enabled_modules'); values.push(enabledModules); }

        if (sets.length === 0) {
            return this.findById(catalogPrisma, id);
        }

        // Use individual queries for each field to keep it safe with parameterized queries
        if (name !== undefined) {
            await catalogPrisma.$executeRaw`UPDATE tenants SET name = ${name}, updated_at = ${now} WHERE id = ${id}::uuid`;
        }
        if (plan !== undefined) {
            await catalogPrisma.$executeRaw`UPDATE tenants SET plan = ${plan}, updated_at = ${now} WHERE id = ${id}::uuid`;
        }
        if (maxUsers !== undefined) {
            await catalogPrisma.$executeRaw`UPDATE tenants SET max_users = ${maxUsers}, updated_at = ${now} WHERE id = ${id}::uuid`;
        }
        if (isActive !== undefined) {
            await catalogPrisma.$executeRaw`UPDATE tenants SET is_active = ${isActive}, updated_at = ${now} WHERE id = ${id}::uuid`;
        }
        if (enabledModules !== undefined) {
            const modulesJson = JSON.stringify(enabledModules);
            await catalogPrisma.$executeRaw`UPDATE tenants SET enabled_modules = ${modulesJson}::jsonb, updated_at = ${now} WHERE id = ${id}::uuid`;
        }

        return this.findById(catalogPrisma, id);
    }

    /**
     * Desativa tenant (soft delete).
     */
    static async deactivate(catalogPrisma, id) {
        const now = new Date();
        await catalogPrisma.$executeRaw`
      UPDATE tenants SET is_active = false, updated_at = ${now} WHERE id = ${id}::uuid
    `;
        return this.findById(catalogPrisma, id);
    }
}

module.exports = TenantRepository;
