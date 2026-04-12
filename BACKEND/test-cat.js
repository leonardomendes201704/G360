const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  try {
    const p = prisma.$extends({
      query: {
        $allModels: {
          $allOperations({ model, operation, args, query }) {
            return prisma.$executeRawUnsafe(`SET search_path TO tenant_liotecnica`).then(() => query(args))
          }
        }
      }
    });
    
    // Test creating
    const res = await p.ticketCategory.create({ data: { name: "Test Cat Temp" } });
    console.log("Success:", res);
    await p.ticketCategory.delete({ where: { id: res.id } });
  } catch (e) {
    console.error("Error creating category:", e);
  } finally {
    await prisma.$disconnect();
  }
}
main();
