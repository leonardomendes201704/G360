const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    const email = 'admin@g360.com.br';
    const password = process.argv[2] || process.env.ADMIN_PASSWORD;

    if (!password) {
        console.error('❌ Usage: node reset_admin.js <new_password>');
        console.error('   Or set ADMIN_PASSWORD env var.');
        process.exit(1);
    }

    console.log('🔄 Resetting Admin User...');
    const hashedPassword = await bcrypt.hash(password, 10);

    // Check if user exists
    const user = await prisma.user.findUnique({
        where: { email }
    });

    if (!user) {
        console.log('❌ User not found, cannot reset password.');
        return;
    }

    await prisma.user.update({
        where: { email },
        data: {
            password: hashedPassword
        }
    });

    console.log('✅ Admin password reset successfully.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
