require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true }
  });
  
  const tenants = await prisma.tenant.findMany({
    select: { id: true, name: true, slug: true }
  });
  
  console.log(JSON.stringify({ users, tenants }, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
