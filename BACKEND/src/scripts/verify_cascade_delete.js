const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('🚀 Starting Cascade Delete Verification...');

    try {
        // 1. Create a Test Tenant
        const tenant = await prisma.tenant.create({
            data: {
                name: 'Cascade Test Corp',
                slug: 'cascade-test',
                users: {
                    create: {
                        name: 'Test Admin',
                        email: 'admin@cascadetest.com',
                        password: 'hash',
                        // Department and CostCenter might be required depending on schema, 
                        // but based on my read they are optional or have defaults/nullable?
                        // Checking schema: Department and CostCenter are optional relations on User.
                    }
                }
            }
        });

        console.log(`✅ Created Tenant: ${tenant.id}`);

        // Verify User details
        const user = await prisma.user.findFirst({
            where: { tenantId: tenant.id }
        });

        if (!user) throw new Error('User creation failed');
        console.log(`✅ Created User: ${user.id} linked to Tenant`);

        // 2. Delete the Tenant
        console.log('🗑️  Attempting to delete Tenant...');
        await prisma.tenant.delete({
            where: { id: tenant.id }
        });

        // 3. Verify Deletion
        const tenantCheck = await prisma.tenant.findUnique({ where: { id: tenant.id } });
        const userCheck = await prisma.user.findUnique({ where: { id: user.id } });

        if (!tenantCheck && !userCheck) {
            console.log('✅ SUCCESS: Tenant and linked User were deleted!');
        } else {
            console.error('❌ FAILURE: Deletion did not cascade properly.');
            console.error('Tenant:', tenantCheck);
            console.error('User:', userCheck);
            process.exit(1);
        }

    } catch (error) {
        console.error('❌ Error during verification:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
