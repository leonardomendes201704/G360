require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tenants = await prisma.tenant.findMany({
    select: { id: true, name: true, slug: true, schemaName: true, isActive: true }
  });
  
  const results = [];
  
  for (const tenant of tenants) {
    try {
      const users = await prisma.$queryRawUnsafe(`SELECT id, name, email FROM "${tenant.schemaName}"."User"`);
      results.push({
        tenant: tenant.name,
        slug: tenant.slug,
        schemaName: tenant.schemaName,
        users: users
      });
    } catch (err) {
      console.error(`Error querying schema ${tenant.schemaName}:`, err.message);
    }
  }
  
  console.log(JSON.stringify(results, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
