/**
 * Seed do catálogo ITIL (categorias, SLAs, serviços com formulários).
 * Uso: na raiz do BACKEND: `node seed-catalog.js`
 * Requer DATABASE_URL apontando para o schema do tenant (ex.: ?schema=public ou tenant_x).
 */
require('dotenv').config();
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { seedItilServiceCatalog } = require('./src/scripts/seed-itil-service-catalog');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Catálogo ITIL — categorias, SLAs e serviços...\n');
  const r = await seedItilServiceCatalog(prisma, { verbose: true });
  console.log(`\n✅ Concluído: ${r.slas} SLAs, ${r.categories} categorias, serviços criados/atualizados.\n`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Erro:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
