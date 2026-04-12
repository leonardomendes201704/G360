const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting Seed...');

    // 1. Criar Roles
    const roles = [
        { name: 'Super Admin', description: 'Acesso total ao sistema' },
        { name: 'Admin', description: 'Administrador do Sistema' },
        { name: 'Director', description: 'Diretor de Área' },
        { name: 'Manager', description: 'Gestor de Departamento/Centro de Custo' },
        { name: 'Collaborator', description: 'Colaborador comum' }
    ];

    for (const roleData of roles) {
        const existing = await prisma.role.findFirst({
            where: { name: roleData.name }
        });

        if (!existing) {
            await prisma.role.create({ data: roleData });
        }
    }
    console.log('✅ Roles created');

    const adminEmail = 'admin@g360.com.br';
    const adminPassword = process.argv[2] || process.env.ADMIN_PASSWORD;

    if (!adminPassword) {
        console.error('❌ Usage: node create_admin.js <password>');
        console.error('   Or set ADMIN_PASSWORD env var.');
        process.exit(1);
    }

    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    const superAdminRole = await prisma.role.findFirst({ where: { name: 'Super Admin' } });

    if (!superAdminRole) {
        throw new Error('Super Admin role failed to create');
    }

    // Verifica se usuário já existe
    const existingUser = await prisma.user.findUnique({
        where: { email: adminEmail }
    });

    if (existingUser) {
        console.log('✅ Admin user already exists');
        return;
    }

    const adminUser = await prisma.user.create({
        data: {
            name: 'Super Admin',
            email: adminEmail,
            password: hashedPassword,
            isActive: true,
            roles: {
                connect: { id: superAdminRole.id }
            }
        }
    });

    console.log(`✅ Admin user created: ${adminUser.email}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
