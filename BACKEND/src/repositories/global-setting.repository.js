/**
 * GlobalSettingRepository — Acesso a dados para global_settings (schema public).
 * 
 * Usa $queryRaw pois a tabela está no schema public (catálogo),
 * não no schema do tenant.
 */

const TenantManager = require('../config/tenant-manager');

class GlobalSettingRepository {

    static getCatalog() {
        return TenantManager.getCatalogClient();
    }

    /**
     * Lista todas as configurações globais.
     */
    static async findAll() {
        const catalog = this.getCatalog();
        return catalog.$queryRaw`
            SELECT id, category, key, value, value_type AS "valueType",
                   label, description,
                   created_at AS "createdAt", updated_at AS "updatedAt"
            FROM public.global_settings
            ORDER BY category, key
        `;
    }

    /**
     * Lista configurações por categoria.
     */
    static async findByCategory(category) {
        const catalog = this.getCatalog();
        return catalog.$queryRaw`
            SELECT id, category, key, value, value_type AS "valueType",
                   label, description,
                   created_at AS "createdAt", updated_at AS "updatedAt"
            FROM public.global_settings
            WHERE category = ${category}
            ORDER BY key
        `;
    }

    /**
     * Busca uma configuração específica por category+key.
     */
    static async findByKey(category, key) {
        const catalog = this.getCatalog();
        const results = await catalog.$queryRaw`
            SELECT id, category, key, value, value_type AS "valueType",
                   label, description,
                   created_at AS "createdAt", updated_at AS "updatedAt"
            FROM public.global_settings
            WHERE category = ${category} AND key = ${key}
            LIMIT 1
        `;
        return results.length > 0 ? results[0] : null;
    }

    /**
     * Cria ou atualiza uma configuração.
     */
    static async upsert(category, key, value, label = null, description = null) {
        const catalog = this.getCatalog();
        await catalog.$executeRawUnsafe(`
            INSERT INTO public.global_settings (category, key, value, label, description, updated_at)
            VALUES ($1, $2, $3, $4, $5, NOW())
            ON CONFLICT (category, key) DO UPDATE SET
                value = EXCLUDED.value,
                updated_at = NOW()
        `, category, key, value, label, description);

        return this.findByKey(category, key);
    }

    static async bulkUpsert(settings) {
        const catalog = this.getCatalog();

        for (const s of settings) {
            await catalog.$executeRawUnsafe(`
                INSERT INTO public.global_settings (category, key, value, value_type, label, description, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, NOW())
                ON CONFLICT (category, key) DO UPDATE SET
                    value = EXCLUDED.value,
                    updated_at = NOW()
            `, s.category, s.key, String(s.value), s.valueType || 'STRING', s.label || null, s.description || null);
        }

        return this.findAll();
    }
}

module.exports = GlobalSettingRepository;
