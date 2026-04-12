const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();
const API_URL = 'http://localhost:3001/api';

async function verifyRBAC() {
    console.log('🔒 Verifying RBAC Implementation...');

    // 1. Setup Data
    const tenantSlug = 'verifyrbac-' + Date.now();
    const userEmail = `rbac-${Date.now()}@test.com`;

    try {
        // Create Tenant
        const tenant = await prisma.tenant.create({
            data: { name: 'RBAC Test Tenant', slug: tenantSlug }
        });
        console.log(`✅ Tenant Created: ${tenant.slug}`);

        // Create Roles
        const writeRole = await prisma.role.create({
            data: {
                name: 'Project Manager',
                permissions: {
                    create: [{ module: 'PROJECTS', action: 'WRITE' }, { module: 'PROJECTS', action: 'READ' }]
                }
            }
        });
        const readRole = await prisma.role.create({
            data: {
                name: 'Project Viewer',
                permissions: {
                    create: [{ module: 'PROJECTS', action: 'READ' }]
                }
            }
        });

        // Create Users
        const writeUser = await prisma.user.create({
            data: {
                name: 'Write User',
                email: 'write-' + userEmail,
                password: 'password123',
                tenantId: tenant.id,
                roleId: writeRole.id
            }
        });

        const readUser = await prisma.user.create({
            data: {
                name: 'Read User',
                email: 'read-' + userEmail,
                password: 'password123',
                tenantId: tenant.id,
                roleId: readRole.id
            }
        });

        // Generate Tokens
        if (!process.env.JWT_SECRET) {
            console.error('❌ JWT_SECRET not defined. Set it in .env');
            process.exit(1);
        }
        const writeToken = jwt.sign({ userId: writeUser.id, tenantId: tenant.id, roleId: writeUser.roleId }, process.env.JWT_SECRET, { algorithm: 'HS256' });
        const readToken = jwt.sign({ userId: readUser.id, tenantId: tenant.id, roleId: readUser.roleId }, process.env.JWT_SECRET, { algorithm: 'HS256' });

        // Helper for requests
        const request = async (method, path, body, token) => {
            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            };
            const options = {
                method,
                headers,
                body: body ? JSON.stringify(body) : undefined
            };
            const res = await fetch(`${API_URL}${path}`, options);
            let data;
            try { data = await res.json(); } catch (e) { }
            return { status: res.status, data };
        };

        // 2. Test Cases

        // Case A: Write User tries to CREATE Project -> Expect SUCCESS (201)
        console.log('--- TEST A: Write User CREATE Project ---');
        try {
            const res = await request('POST', '/projects', {
                name: 'Allowed Project',
                description: 'Should work'
            }, writeToken);

            if (res.status === 201) {
                console.log('✅ PASS: Write User created project successfully.');
            } else {
                console.error('❌ FAIL: Write User execution failed:', res.status, res.data);
            }
        } catch (error) {
            console.error('❌ FAIL: Write User Exception:', error);
        }

        // Case B: Read User tries to CREATE Project -> Expect FORBIDDEN (403)
        console.log('--- TEST B: Read User CREATE Project ---');
        try {
            const res = await request('POST', '/projects', {
                name: 'Forbidden Project',
                description: 'Should fail'
            }, readToken);

            if (res.status === 403) {
                console.log('✅ PASS: Read User correctly blocked (403 Forbidden).');
            } else {
                console.error(`❌ FAIL: Unexpected status ${res.status}`);
            }
        } catch (error) {
            console.error('❌ FAIL: Read User Exception:', error);
        }

        // Case C: Read User tries to LIST Projects -> Expect SUCCESS (200)
        console.log('--- TEST C: Read User LIST Projects ---');
        try {
            const res = await request('GET', '/projects', null, readToken);
            if (res.status === 200) {
                console.log('✅ PASS: Read User listed projects successfully.');
            } else {
                console.error('❌ FAIL: Read User list execution failed:', res.status);
            }
        } catch (error) {
            console.error('❌ FAIL: Read User List Exception:', error);
        }

        // Case D: Write User tries to ACCESS FINANCE -> Expect FORBIDDEN (403) (No finance permission)
        console.log('--- TEST D: Write User ACCESS Finance ---');
        try {
            const res = await request('GET', '/budgets', null, writeToken);
            if (res.status === 403) {
                console.log('✅ PASS: User without Finance access correctly blocked.');
            } else {
                console.error(`❌ FAIL: Unexpected status ${res.status}`);
            }
        } catch (error) {
            console.error('❌ FAIL: Finance Access Exception:', error);
        }

        // Cleanup
        await prisma.user.deleteMany({ where: { tenantId: tenant.id } });
        await prisma.role.deleteMany({ where: { id: { in: [writeRole.id, readRole.id] } } });
        await prisma.tenant.delete({ where: { id: tenant.id } });

    } catch (err) {
        console.error('Test Script Error:', err);
    } finally {
        await prisma.$disconnect();
    }
}

verifyRBAC();
