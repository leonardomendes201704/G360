const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function ensureDirectorRole() {
    console.log('👔 Ensuring Director Role exists...');

    try {
        let role = await prisma.role.findFirst({
            where: {
                OR: [{ name: 'Director' }, { name: 'Diretor' }]
            }
        });

        if (role) {
            console.log(`✅ Role found: ${role.name} (${role.id})`);
        } else {
            console.log('✨ Creating new Director role...');
            role = await prisma.role.create({
                data: {
                    name: 'Director',
                    description: 'Access to all data within the Company',
                    permissions: {
                        // Add permissions if using RBAC middleware too
                        create: [
                            { module: 'PROJECTS', action: 'READ' },
                            { module: 'PROJECTS', action: 'WRITE' },
                            { module: 'PROJECTS', action: 'DELETE' },
                            { module: 'FINANCE', action: 'READ' },
                            { module: 'FINANCE', action: 'WRITE' },
                            { module: 'FINANCE', action: 'DELETE' },
                            // Add others as needed
                            { module: 'TASKS', action: 'READ' },
                            { module: 'TASKS', action: 'WRITE' },
                            { module: 'TASKS', action: 'DELETE' }
                        ]
                    }
                }
            });
            console.log(`✅ Role Created: ${role.name} (${role.id})`);
        }

        console.log('ℹ️  Note: Users with this role will execute "Director" scoping logic (See all data in Tenant).');

    } catch (e) {
        console.error('❌ Error:', e);
    } finally {
        await prisma.$disconnect();
    }
}

ensureDirectorRole();
