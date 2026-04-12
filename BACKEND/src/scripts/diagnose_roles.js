/**
 * Script de diagnóstico para verificar roles e permissões no banco
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function diagnose() {
    console.log('🔍 DIAGNÓSTICO DE ROLES E PERMISSÕES\n');
    console.log('='.repeat(60));

    // 1. Listar todos os roles existentes
    console.log('\n📋 ROLES CADASTRADOS:');
    const roles = await prisma.role.findMany({
        include: { permissions: true, users: { select: { id: true, name: true, email: true } } }
    });

    for (const role of roles) {
        console.log(`\n  [${role.id}] "${role.name}"`);
        console.log(`      Descrição: ${role.description || 'N/A'}`);
        console.log(`      Permissões: ${role.permissions.length}`);
        console.log(`      Usuários vinculados: ${role.users.length}`);
        if (role.users.length > 0) {
            role.users.forEach(u => console.log(`        - ${u.email} (${u.name})`));
        }
    }

    // 2. Verificar especificamente roles com nome similar a "Super Admin"
    console.log('\n' + '='.repeat(60));
    console.log('\n🔎 BUSCANDO ROLES DO TIPO ADMIN:');
    const adminRoles = roles.filter(r =>
        r.name.toLowerCase().includes('admin') ||
        r.name.toLowerCase().includes('super')
    );

    if (adminRoles.length === 0) {
        console.log('  ⚠️  NENHUM ROLE COM "ADMIN" OU "SUPER" ENCONTRADO!');
    } else {
        adminRoles.forEach(r => {
            console.log(`  ✓ Role encontrado: "${r.name}"`);
            console.log(`    → Valor exato (bytes): ${Buffer.from(r.name).toString('hex')}`);
        });
    }

    // 3. Listar usuários e suas roles
    console.log('\n' + '='.repeat(60));
    console.log('\n👤 USUÁRIOS E SEUS ROLES:');
    const users = await prisma.user.findMany({
        include: { roles: { select: { id: true, name: true } } },
        where: { isActive: true }
    });

    for (const user of users) {
        console.log(`\n  ${user.email}:`);
        if (user.roles.length === 0) {
            console.log('    ⚠️  SEM ROLES ATRIBUÍDOS!');
        } else {
            user.roles.forEach(r => console.log(`    → "${r.name}"`));
        }
    }

    console.log('\n' + '='.repeat(60));
    console.log('\n✅ Diagnóstico completo.\n');

    await prisma.$disconnect();
}

diagnose().catch(e => {
    console.error('❌ Erro:', e);
    prisma.$disconnect();
});
