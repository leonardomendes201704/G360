/**
 * Redefine a senha do usuário admin em todos os schemas de tenants ativos.
 * Login sem tenantSlug procura o email em cada tenant — a senha precisa estar correta no schema onde o usuário existe.
 *
 * Uso:
 *   node src/scripts/reset-admin-password-all-tenants.js
 *
 * Variáveis opcionais (.env ou ambiente):
 *   RESET_ADMIN_EMAIL   (padrão: admin@g360.com.br)
 *   NEW_ADMIN_PASSWORD  (padrão: gerada abaixo se não definir)
 */
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const EMAIL = (process.env.RESET_ADMIN_EMAIL || 'admin@g360.com.br').trim();

function defaultPassword() {
  if (process.env.NEW_ADMIN_PASSWORD && String(process.env.NEW_ADMIN_PASSWORD).trim()) {
    return String(process.env.NEW_ADMIN_PASSWORD).trim();
  }
  return `G360#${crypto.randomBytes(4).toString('hex')}Aa!`;
}

function getBaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL não configurada. Crie BACKEND/.env com a conexão PostgreSQL.');
  }
  return url.replace(/\?schema=[^&]*/, '').replace(/&schema=[^&]*/, '');
}

function buildUrlForSchema(schemaName) {
  const baseUrl = getBaseUrl();
  const separator = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${separator}schema=${schemaName}`;
}

async function main() {
  const newPassword = defaultPassword();
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  const catalogUrl = buildUrlForSchema('public');
  const catalog = new PrismaClient({ datasources: { db: { url: catalogUrl } } });

  const tenants = await catalog.$queryRaw`
    SELECT id, name, slug, schema_name AS "schemaName"
    FROM tenants
    WHERE is_active = true
    ORDER BY slug
  `;

  console.log(`\nTenants ativos: ${tenants.length}\n`);

  let updated = 0;

  for (const t of tenants) {
    const tenantPrisma = new PrismaClient({
      datasources: { db: { url: buildUrlForSchema(t.schemaName) } },
    });
    try {
      let user = await tenantPrisma.user.findUnique({ where: { email: EMAIL } });
      if (!user) {
        user = await tenantPrisma.user.findFirst({
          where: { email: { equals: EMAIL, mode: 'insensitive' } },
        });
      }
      if (!user) {
        console.log(`⚠️  [${t.slug}] schema=${t.schemaName} — "${EMAIL}" não encontrado`);
        continue;
      }

      await tenantPrisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          authProvider: 'LOCAL',
          isActive: true,
        },
      });

      const key = EMAIL.toLowerCase();
      await tenantPrisma.loginAttempt.deleteMany({ where: { email: key } });

      console.log(`✅ [${t.slug}] schema=${t.schemaName} — senha atualizada, bloqueio de login limpo`);
      updated += 1;
    } catch (err) {
      console.error(`❌ [${t.slug}] schema=${t.schemaName}:`, err.message);
    } finally {
      await tenantPrisma.$disconnect();
    }
  }

  await catalog.$disconnect();

  console.log('\n---');
  console.log(`Email: ${EMAIL}`);
  console.log(`Schemas atualizados: ${updated}`);
  console.log(`Nova senha: ${newPassword}`);
  console.log('---\n');
}

main().catch((e) => {
  console.error('❌', e.message);
  process.exit(1);
});
