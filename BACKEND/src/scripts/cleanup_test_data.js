const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Anti-IA Audit #2 — Clean test/dummy data from database
 * 
 * Targets:
 *   - ChangeRequests with title "teste" or "tres"
 *   - Incidents with title "teste"
 *   - AssetCategories named "TESTE" 
 *   - IncidentCategories that look like raw IDs (e.g. "798")
 * 
 * Usage: node src/scripts/cleanup_test_data.js [--dry-run]
 */

const DRY_RUN = process.argv.includes('--dry-run');

async function main() {
    console.log(`\n🧹 Anti-IA Audit — Cleanup Test Data ${DRY_RUN ? '(DRY RUN)' : ''}\n`);

    let totalCleaned = 0;

    // 1. ChangeRequests with test titles
    const testGmuds = await prisma.changeRequest.findMany({
        where: {
            OR: [
                { title: { contains: 'teste', mode: 'insensitive' } },
                { title: { contains: 'tres', mode: 'insensitive' } },
            ]
        },
        select: { id: true, title: true, code: true }
    });

    if (testGmuds.length > 0) {
        console.log(`📌 GMUDs com dados de teste (${testGmuds.length}):`);
        testGmuds.forEach(g => console.log(`   - [${g.code}] "${g.title}"`));

        if (!DRY_RUN) {
            // Delete related records first (approvers, attachments, etc.)
            const gmudIds = testGmuds.map(g => g.id);
            await prisma.changeApprover.deleteMany({ where: { changeRequestId: { in: gmudIds } } });
            await prisma.changeAttachment.deleteMany({ where: { changeRequestId: { in: gmudIds } } }).catch(() => { });
            await prisma.changeRequest.deleteMany({ where: { id: { in: gmudIds } } });
            console.log(`   ✅ ${testGmuds.length} GMUDs removidas`);
        }
        totalCleaned += testGmuds.length;
    } else {
        console.log('✅ GMUDs — sem dados de teste');
    }

    // 2. Incidents with test titles
    const testIncidents = await prisma.incident.findMany({
        where: {
            title: { contains: 'teste', mode: 'insensitive' }
        },
        select: { id: true, title: true, code: true }
    });

    if (testIncidents.length > 0) {
        console.log(`\n📌 Incidentes com dados de teste (${testIncidents.length}):`);
        testIncidents.forEach(i => console.log(`   - [${i.code || 'N/A'}] "${i.title}"`));

        if (!DRY_RUN) {
            const incIds = testIncidents.map(i => i.id);
            await prisma.incidentComment.deleteMany({ where: { incidentId: { in: incIds } } }).catch(() => { });
            await prisma.incidentAttachment.deleteMany({ where: { incidentId: { in: incIds } } }).catch(() => { });
            await prisma.incidentHistory.deleteMany({ where: { incidentId: { in: incIds } } }).catch(() => { });
            await prisma.incident.deleteMany({ where: { id: { in: incIds } } });
            console.log(`   ✅ ${testIncidents.length} Incidentes removidos`);
        }
        totalCleaned += testIncidents.length;
    } else {
        console.log('✅ Incidentes — sem dados de teste');
    }

    // 3. Asset categories named "TESTE"
    const testAssetCats = await prisma.assetCategory.findMany({
        where: {
            name: { contains: 'TESTE', mode: 'insensitive' }
        },
        select: { id: true, name: true }
    });

    if (testAssetCats.length > 0) {
        console.log(`\n📌 Categorias de Ativos com dados de teste (${testAssetCats.length}):`);
        testAssetCats.forEach(c => console.log(`   - "${c.name}" (id: ${c.id})`));

        if (!DRY_RUN) {
            const catIds = testAssetCats.map(c => c.id);
            // Move any assets in these categories to uncategorized (set null)
            await prisma.asset.updateMany({
                where: { categoryId: { in: catIds } },
                data: { categoryId: null }
            }).catch(() => { });
            await prisma.assetCategory.deleteMany({ where: { id: { in: catIds } } });
            console.log(`   ✅ ${testAssetCats.length} categorias removidas`);
        }
        totalCleaned += testAssetCats.length;
    } else {
        console.log('✅ Categorias de Ativos — sem dados de teste');
    }

    // 4. Incident categories that are raw IDs or test names
    const allIncCats = await prisma.incidentCategory.findMany({
        select: { id: true, name: true }
    });
    const testIncCats = allIncCats.filter(c =>
        /^\d+$/.test(c.name) || // Pure numeric like "798"
        c.name.toLowerCase() === 'teste'
    );

    if (testIncCats.length > 0) {
        console.log(`\n📌 Categorias de Incidentes suspeitas (${testIncCats.length}):`);
        testIncCats.forEach(c => console.log(`   - "${c.name}" (id: ${c.id})`));

        if (!DRY_RUN) {
            const catIds = testIncCats.map(c => c.id);
            await prisma.incident.updateMany({
                where: { categoryId: { in: catIds } },
                data: { categoryId: null }
            }).catch(() => { });
            await prisma.incidentCategory.deleteMany({ where: { id: { in: catIds } } });
            console.log(`   ✅ ${testIncCats.length} categorias removidas`);
        }
        totalCleaned += testIncCats.length;
    } else {
        console.log('✅ Categorias de Incidentes — sem dados suspeitos');
    }

    console.log(`\n${'='.repeat(50)}`);
    console.log(`Total encontrado: ${totalCleaned} registros de teste`);
    if (DRY_RUN && totalCleaned > 0) {
        console.log('⚠️  Execute sem --dry-run para remover os dados');
    }
    console.log();
}

main()
    .catch((e) => {
        console.error('❌ Erro:', e.message);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
