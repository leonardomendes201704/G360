const { execSync } = require('child_process');
const path = require('path');
const bcrypt = require('bcryptjs');
const TenantRepository = require('../repositories/tenant.repository');
const TenantManager = require('../config/tenant-manager');
const {
    getManagerDefaultPermissions,
    getCollaboratorDefaultPermissions,
    getCabDefaultPermissions,
} = require('../config/rbac-default-permissions');
const logger = require('../config/logger');

/**
 * TenantService — Lógica de negócio para gerenciamento de tenants.
 * Inclui provisionamento de schema, migrations e seed.
 */
class TenantService {

    /**
     * Cria um novo tenant com provisionamento completo.
     * 1. Valida slug
     * 2. Insere no catálogo
     * 3. Cria schema no PostgreSQL
     * 4. Roda migrations
     * 5. Seed com dados básicos (roles, permissões, admin user)
     */
    static async create(catalogPrisma, data) {
        const { name, slug, plan = 'STANDARD', maxUsers = 50, adminEmail, adminPassword } = data;

        // 1. Validar slug
        const normalizedSlug = this.normalizeSlug(slug);
        if (!normalizedSlug) {
            throw { statusCode: 400, message: 'Slug inválido. Use apenas letras, números e hífens.' };
        }

        // 2. Verificar se já existe
        const existing = await TenantRepository.findBySlug(catalogPrisma, normalizedSlug);
        if (existing) {
            throw { statusCode: 409, message: `Tenant com slug "${normalizedSlug}" já existe.` };
        }

        // 3. Gerar schemaName
        const schemaName = `tenant_${normalizedSlug.replace(/-/g, '_')}`;

        // 4. Verificar se schema já existe
        const existingSchema = await TenantRepository.findBySchemaName(catalogPrisma, schemaName);
        if (existingSchema) {
            throw { statusCode: 409, message: `Schema "${schemaName}" já está em uso.` };
        }

        // 5. Inserir no catálogo
        const tenant = await TenantRepository.create(catalogPrisma, {
            name,
            slug: normalizedSlug,
            schemaName,
            plan,
            maxUsers,
        });

        logger.info(`[TenantService] Tenant criado no catálogo: ${name} (${schemaName})`);

        try {
            // 6. Criar schema no PostgreSQL
            await this.createSchema(catalogPrisma, schemaName);

            // 7. Rodar migrations
            await this.runMigrations(schemaName);

            // 8. Seed com dados básicos
            const finalAdminEmail = adminEmail || `admin@${normalizedSlug}.com`;
            const finalAdminPassword = adminPassword || 'admin123';
            await this.seedTenant(schemaName, finalAdminEmail, finalAdminPassword, name);

            logger.info(`[TenantService] Provisionamento completo: ${schemaName}`);
        } catch (error) {
            logger.error(`[TenantService] Erro no provisionamento de ${schemaName}:`, error);
            // Marcar tenant como inativo se provisionamento falhou
            await TenantRepository.update(catalogPrisma, tenant.id, { isActive: false });
            throw {
                statusCode: 500,
                message: `Tenant criado no catálogo mas provisionamento falhou: ${error.message}`,
                details: error.message,
            };
        }

        return tenant;
    }

    /**
     * Lista todos os tenants.
     */
    static async findAll(catalogPrisma) {
        return TenantRepository.findAll(catalogPrisma);
    }

    /**
     * Busca tenant por ID.
     */
    static async findById(catalogPrisma, id) {
        const tenant = await TenantRepository.findById(catalogPrisma, id);
        if (!tenant) {
            throw { statusCode: 404, message: 'Tenant não encontrado.' };
        }
        return tenant;
    }

    /**
     * Atualiza tenant.
     */
    static async update(catalogPrisma, id, data) {
        await this.findById(catalogPrisma, id); // Verifica existência
        return TenantRepository.update(catalogPrisma, id, data);
    }

    /**
     * Desativa tenant (soft delete).
     */
    static async deactivate(catalogPrisma, id) {
        const tenant = await this.findById(catalogPrisma, id);

        // Evict do pool para liberar conexões
        try {
            await TenantManager.evictClient(tenant.schemaName);
        } catch (e) {
            logger.warn(`[TenantService] Erro ao evictar client: ${e.message}`);
        }

        return TenantRepository.deactivate(catalogPrisma, id);
    }

    // ===== MÉTODOS INTERNOS =====

    /**
     * Normaliza o slug: lowercase, sem espaços, apenas alfanuméricos e hífens.
     */
    static normalizeSlug(slug) {
        if (!slug || typeof slug !== 'string') return null;
        const normalized = slug
            .toLowerCase()
            .trim()
            .replace(/\s+/g, '-')       // espaços → hífens
            .replace(/[^a-z0-9-]/g, '') // remove caracteres inválidos
            .replace(/-+/g, '-')        // múltiplos hífens → um
            .replace(/^-|-$/g, '');     // remove hífens no início/fim

        if (normalized.length < 2 || normalized.length > 50) return null;
        return normalized;
    }

    /**
     * Cria o schema no PostgreSQL.
     */
    static async createSchema(catalogPrisma, schemaName) {
        // Sanitize schema name to prevent SQL injection (only allow a-z, 0-9, _)
        if (!/^[a-z0-9_]+$/.test(schemaName)) {
            throw new Error(`Schema name inválido: ${schemaName}`);
        }

        await catalogPrisma.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);
        logger.info(`[TenantService] Schema criado: ${schemaName}`);
    }

    /**
     * Roda as migrations do Prisma no schema do tenant.
     */
    static async runMigrations(schemaName) {
        const schemaPath = path.resolve(__dirname, '../prisma/schema.prisma');

        // Construir DATABASE_URL com o schema correto
        const baseUrl = process.env.DATABASE_URL
            .replace(/\?schema=[^&]*/, '')
            .replace(/&schema=[^&]*/, '');
        const separator = baseUrl.includes('?') ? '&' : '?';
        const tenantUrl = `${baseUrl}${separator}schema=${schemaName}`;

        try {
            execSync(
                `npx prisma migrate deploy --schema="${schemaPath}"`,
                {
                    env: { ...process.env, DATABASE_URL: tenantUrl },
                    stdio: 'pipe',
                    timeout: 60000, // 60s timeout
                }
            );
            logger.info(`[TenantService] Migrations aplicadas: ${schemaName}`);
        } catch (error) {
            const stderr = error.stderr?.toString() || '';
            logger.error(`[TenantService] Erro nas migrations de ${schemaName}: ${stderr}`);
            throw new Error(`Migrations falharam para ${schemaName}: ${stderr}`);
        }
    }

    /**
     * Seed com dados básicos para o novo tenant:
     * - Roles: Super Admin, Manager, Collaborator, CAB Member
     * - Permissões padrão por role
     * - User admin do tenant
     */
    static async seedTenant(schemaName, adminEmail, adminPassword, tenantName) {
        const prisma = TenantManager.getClientForTenant(schemaName);

        try {
            // 1. Criar Roles
            const superAdminRole = await prisma.role.create({
                data: { name: 'Super Admin', description: 'Acesso total ao sistema do Inquilino' }
            });

            const managerRole = await prisma.role.create({
                data: { name: 'Manager', description: 'Gestor de Área' }
            });

            const collaboratorRole = await prisma.role.create({
                data: { name: 'Collaborator', description: 'Colaborador Padrão' }
            });

            const cabRole = await prisma.role.create({
                data: { name: 'CAB Member', description: 'Membro do CAB' }
            });

            // 2. Permissões alinhadas a rbac-matrix.json (mesmo conjunto do seed global)
            await prisma.role.update({
                where: { id: managerRole.id },
                data: { permissions: { create: getManagerDefaultPermissions() } }
            });

            await prisma.role.update({
                where: { id: cabRole.id },
                data: { permissions: { create: getCabDefaultPermissions() } }
            });

            await prisma.role.update({
                where: { id: collaboratorRole.id },
                data: { permissions: { create: getCollaboratorDefaultPermissions() } }
            });

            // 3. Criar User Admin
            const hashedPassword = await bcrypt.hash(adminPassword, 10);
            await prisma.user.create({
                data: {
                    name: `Administrador - ${tenantName}`,
                    email: adminEmail,
                    password: hashedPassword,
                    isActive: true,
                    roles: { connect: { id: superAdminRole.id } },
                }
            });

            logger.info(`[TenantService] Seed completo para ${schemaName}: admin=${adminEmail}`);
        } catch (error) {
            logger.error(`[TenantService] Erro no seed de ${schemaName}:`, error);
            throw new Error(`Seed falhou para ${schemaName}: ${error.message}`);
        }
    }
}

module.exports = TenantService;
