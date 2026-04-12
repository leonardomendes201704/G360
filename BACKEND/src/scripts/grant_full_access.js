const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function grantAccess() {
    try {
        console.log('🔍 Locating Tenant and User...');
        const tenant = await prisma.tenant.findUnique({ where: { slug: 'liotecnica' } });
        if (!tenant) throw new Error('Tenant liotecnica not found.');

        const user = await prisma.user.findFirst({
            where: { email: 'sistemas@liotecnica.com.br', tenantId: tenant.id }
        });
        if (!user) {
            // List available users for debugging
            const users = await prisma.user.findMany({ where: { tenantId: tenant.id } });
            console.log('Users found in tenant:', users.map(u => u.email));
            throw new Error('User sistemas@liotecnica.com.br not found.');
        }

        console.log(`✅ Found User: ${user.name} (${user.id})`);

        // Check/Create Super Admin Role
        let role = await prisma.role.findFirst({ where: { name: 'Super Admin' } });

        const modules = ['PROJECTS', 'TASKS', 'FINANCE', 'SUPPLIERS', 'CONTRACTS', 'ASSETS', 'GMUD', 'CONFIG'];
        const actions = ['READ', 'WRITE', 'DELETE'];

        // Prepare permissions array
        const permissionsData = [];
        for (const m of modules) {
            for (const a of actions) {
                permissionsData.push({ module: m, action: a });
            }
        }

        if (!role) {
            console.log('✨ Creating new Super Admin role...');
            role = await prisma.role.create({
                data: {
                    name: 'Super Admin',
                    description: 'Full access to all modules',
                    permissions: {
                        create: permissionsData
                    }
                }
            });
        } else {
            console.log('🔄 Updating existing Super Admin role permissions...');
            // Ensure it has all permissions by resetting them
            await prisma.$transaction(async (tx) => {
                await tx.permission.deleteMany({ where: { roleId: role.id } });
                await tx.permission.createMany({
                    data: permissionsData.map(p => ({ ...p, roleId: role.id }))
                });
            });
        }

        // Assign Role to User
        console.log(`👤 Assigning role ${role.name} to user...`);
        await prisma.user.update({
            where: { id: user.id },
            data: { roleId: role.id }
        });

        console.log('✅ Success! User has been granted full access.');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

grantAccess();
