const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    const email = 'admin@g360.com.br';
    const newPassword = '@L89*Eb5v@';

    console.log(`🔄 Atualizando senha do usuário: ${email}`);

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const user = await prisma.user.update({
        where: { email },
        data: { password: hashedPassword }
    });

    console.log(`✅ Senha atualizada com sucesso para: ${user.name} (${user.email})`);
}

main()
    .catch((e) => {
        console.error('❌ Erro ao atualizar senha:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
