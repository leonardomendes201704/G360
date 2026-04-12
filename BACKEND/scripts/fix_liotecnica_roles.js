const { PrismaClient } = require('@prisma/client');
async function fix() {
  const prisma = new PrismaClient();
  await prisma.$executeRawUnsafe(`UPDATE tenant_liotecnica."Role" SET name = 'Tenant Admin' WHERE name = 'Super Admin'`);
  console.log("Banco de dados Liotecnica consertado. Privilege Escalation removido.");
  process.exit(0);
}
fix();
