const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('👑 Granting Super Admin role to LUCAS MUNIZ...');

    // 1. Find the User
    const user = await prisma.user.findFirst({
        where: { name: { contains: 'LUCAS MUNIZ', mode: 'insensitive' } }
    });

    if (!user) {
        console.error('❌ User LUCAS MUNIZ not found.');
        return;
    }

    // 2. Find Super Admin Role
    const superAdminRole = await prisma.role.findFirst({
        where: { name: 'Super Admin' }
    });

    if (!superAdminRole) {
        console.error('❌ Role Super Admin not found.');
        return;
    }

    // 3. Assign Role (Keep existing or replace? Usually add)
    // Prisma allows connecting many-to-many
    await prisma.user.update({
        where: { id: user.id },
        data: {
            roles: {
                connect: { id: superAdminRole.id }
            }
        }
    });

    console.log(`✅ Role ${superAdminRole.name} assigned to ${user.name}.`);
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
