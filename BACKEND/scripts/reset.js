const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function reset() {
  const hash = await bcrypt.hash('L89*Eb5v@', 10);
  const result = await prisma.user.updateMany({
    data: { password: hash }
  });
  console.log('Senhas resetadas para ' + result.count + ' usuários com sucesso!');
}
reset().catch(console.error).finally(() => prisma.$disconnect());
