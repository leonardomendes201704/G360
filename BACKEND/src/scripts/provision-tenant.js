/**
 * Script: Provisionar novo Tenant
 * 
 * Cria um novo schema no PostgreSQL, roda migrations e seed inicial.
 * 
 * Uso:
 *   node src/scripts/provision-tenant.js --name "Empresa Alpha" --slug "empresa-alpha"
 * 
 * O que faz:
 *   1. Valida parâmetros
 *   2. Cria schema no PostgreSQL: tenant_<slug>
 *   3. Roda prisma migrate deploy no novo schema
 *   4. Faz seed de dados padrão (roles, permissões, user admin)
 *   5. Registra no catálogo (tabela tenants no schema public)
 */

const { execSync } = require('child_process');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const { PrismaClient } = require('@prisma/client');

// --- Parsear argumentos ---
function parseArgs() {
    const args = {};
    process.argv.slice(2).forEach((arg, i, arr) => {
        if (arg.startsWith('--')) {
            const key = arg.replace('--', '');
            args[key] = arr[i + 1];
        }
    });
    return args;
}

// --- Utilitários ---
function slugToSchemaName(slug) {
    return `tenant_${slug.replace(/-/g, '_')}`;
}

function getBaseUrl() {
    const url = process.env.DATABASE_URL;
    return url.replace(/\?schema=[^&]*/, '').replace(/&schema=[^&]*/, '');
}

function buildUrlForSchema(schemaName) {
    const baseUrl = getBaseUrl();
    const separator = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${separator}schema=${schemaName}`;
}

// --- Criar schema no PostgreSQL ---
async function createSchema(schemaName) {
    const prisma = new PrismaClient();
    try {
        // Verificar se já existe
        const exists = await prisma.$queryRaw`
      SELECT schema_name FROM information_schema.schemata WHERE schema_name = ${schemaName}
    `;

        if (exists.length > 0) {
            console.log(`⚠️  Schema "${schemaName}" já existe.`);
            return false;
        }

        await prisma.$executeRawUnsafe(`CREATE SCHEMA "${schemaName}"`);
        console.log(`✅ Schema "${schemaName}" criado com sucesso.`);
        return true;
    } finally {
        await prisma.$disconnect();
    }
}

// --- Rodar migrations no schema ---
function runMigrations(schemaName) {
    const url = buildUrlForSchema(schemaName);
    const schemaPath = path.resolve(__dirname, '../prisma/schema.prisma');

    console.log(`🔄 Rodando migrations no schema "${schemaName}"...`);

    try {
        execSync(
            `npx prisma migrate deploy --schema="${schemaPath}"`,
            {
                env: { ...process.env, DATABASE_URL: url },
                stdio: 'pipe',
                cwd: path.resolve(__dirname, '../..'),
            }
        );
        console.log(`✅ Migrations aplicadas com sucesso no schema "${schemaName}".`);
    } catch (error) {
        console.error(`❌ Erro ao rodar migrations:`, error.stderr?.toString() || error.message);
        throw error;
    }
}

// --- Seed de dados iniciais ---
async function seedTenant(schemaName, tenantName) {
    const url = buildUrlForSchema(schemaName);
    const prisma = new PrismaClient({ datasources: { db: { url } } });

    try {
        console.log(`🌱 Fazendo seed do tenant "${tenantName}"...`);

        // 1. Criar roles padrão
        const superAdmin = await prisma.role.create({
            data: {
                name: 'Super Admin',
                description: 'Administrador com acesso total ao sistema',
            },
        });

        await prisma.role.create({
            data: {
                name: 'Gestor',
                description: 'Gestor com acesso a módulos de gestão',
            },
        });

        await prisma.role.create({
            data: {
                name: 'Analista',
                description: 'Analista com acesso a consultas e relatórios',
            },
        });

        await prisma.role.create({
            data: {
                name: 'Visualizador',
                description: 'Acesso somente leitura',
            },
        });

        // 2. Permissões do Super Admin = todas as chaves de rbac-matrix.json (canônico)
        const rbacPath = path.join(__dirname, '..', '..', '..', 'rbac-matrix.json');
        const rbac = require(rbacPath);
        for (const modKey of Object.keys(rbac.modules || {})) {
            const mod = rbac.modules[modKey];
            const actionKeys = (mod.actions || []).map((a) => a.key);
            for (const action of actionKeys) {
                await prisma.permission.create({
                    data: {
                        module: modKey,
                        action,
                        roleId: superAdmin.id,
                    },
                });
            }
        }

        // 3. Criar user admin do tenant
        const bcrypt = require('bcryptjs');
        const hashedPassword = await bcrypt.hash('Admin@123', 10);

        await prisma.user.create({
            data: {
                name: `Admin ${tenantName}`,
                email: `admin@${tenantName.toLowerCase().replace(/\s+/g, '')}.com`,
                password: hashedPassword,
                isActive: true,
                authProvider: 'LOCAL',
                roles: { connect: { id: superAdmin.id } },
            },
        });

        // 4. Criar integração AZURE placeholder (desabilitada)
        await prisma.integration.create({
            data: {
                type: 'AZURE',
                name: 'Azure Active Directory',
                isEnabled: false,
                config: {},
            },
        });

        // 5. Criar integração LDAP placeholder (desabilitada)
        await prisma.integration.create({
            data: {
                type: 'LDAP',
                name: 'LDAP / Active Directory',
                isEnabled: false,
                config: {},
            },
        });

        const { seedItilServiceCatalog } = require('./seed-itil-service-catalog');
        console.log(`📚 Catálogo ITIL (SLAs, categorias, serviços)...`);
        await seedItilServiceCatalog(prisma, { verbose: true });

        console.log(`✅ Seed concluído para "${tenantName}".`);
        console.log(`   📧 Admin: admin@${tenantName.toLowerCase().replace(/\s+/g, '')}.com`);
        console.log(`   🔑 Senha: Admin@123 (trocar no primeiro acesso)`);

    } finally {
        await prisma.$disconnect();
    }
}

// --- Registrar no catálogo ---
async function registerInCatalog(name, slug, schemaName) {
    const url = buildUrlForSchema('public');
    const prisma = new PrismaClient({ datasources: { db: { url } } });

    try {
        // Verificar se tabela tenants existe
        const tableExists = await prisma.$queryRaw`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'tenants'
    `;

        if (tableExists.length === 0) {
            // Criar tabela se não existir
            await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS tenants (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL,
          slug VARCHAR(100) UNIQUE NOT NULL,
          schema_name VARCHAR(100) UNIQUE NOT NULL,
          is_active BOOLEAN DEFAULT true,
          plan VARCHAR(50) DEFAULT 'STANDARD',
          max_users INT DEFAULT 50,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `;
            console.log('✅ Tabela "tenants" criada no schema public.');
        }

        // Verificar duplicata
        const existing = await prisma.$queryRaw`
      SELECT id FROM tenants WHERE slug = ${slug}
    `;

        if (existing.length > 0) {
            console.log(`⚠️  Tenant "${slug}" já existe no catálogo.`);
            return;
        }

        await prisma.$executeRaw`
      INSERT INTO tenants (name, slug, schema_name) VALUES (${name}, ${slug}, ${schemaName})
    `;

        console.log(`✅ Tenant "${name}" registrado no catálogo.`);

    } finally {
        await prisma.$disconnect();
    }
}

// --- Main ---
async function main() {
    const args = parseArgs();

    if (!args.name || !args.slug) {
        console.error('❌ Uso: node provision-tenant.js --name "Empresa Alpha" --slug "empresa-alpha"');
        process.exit(1);
    }

    const { name, slug } = args;
    const schemaName = slugToSchemaName(slug);

    console.log(`\n🏗️  Provisionando tenant: "${name}" (slug: ${slug}, schema: ${schemaName})\n`);

    try {
        // 1. Criar schema
        await createSchema(schemaName);

        // 2. Rodar migrations
        runMigrations(schemaName);

        // 3. Seed
        await seedTenant(schemaName, name);

        // 4. Registrar no catálogo
        await registerInCatalog(name, slug, schemaName);

        console.log(`\n🎉 Tenant "${name}" provisionado com sucesso!\n`);

    } catch (error) {
        console.error(`\n❌ Erro ao provisionar tenant:`, error.message);
        process.exit(1);
    }
}

main();
