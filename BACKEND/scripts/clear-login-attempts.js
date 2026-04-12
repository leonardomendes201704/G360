const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Clearing all LoginAttempts to unlock users for testing...');
  const result = await prisma.loginAttempt.deleteMany({});
  console.log(`Cleared ${result.count} records from LoginAttempt table.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
