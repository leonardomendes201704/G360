const { PrismaClient } = require('@prisma/client');
async function restore() {
  const prisma = new PrismaClient();
  await prisma.$executeRawUnsafe(`UPDATE tenant_liotecnica."Role" SET name = 'Super Admin' WHERE name = 'Tenant Admin'`);
  console.log("Banco de dados Liotecnica consertado. Restaurado para Super Admin (mas agora blindado pelo Schema).");
  process.exit(0);
}
restore();
