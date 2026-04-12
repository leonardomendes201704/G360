const { prisma } = require('../config/database');

async function fixInvalidTaskStatuses() {
    console.log('🔧 Corrigindo status inválidos de tarefas...\n');

    // Buscar todas as tarefas
    const allTasks = await prisma.task.findMany();

    const validStatuses = ['BACKLOG', 'TODO', 'IN_PROGRESS', 'DONE'];
    const invalidTasks = allTasks.filter(t => !validStatuses.includes(t.status));

    console.log(`📊 Total de tarefas: ${allTasks.length}`);
    console.log(`⚠️  Tarefas com status inválido: ${invalidTasks.length}\n`);

    if (invalidTasks.length === 0) {
        console.log('✅ Nenhuma tarefa com status inválido!');
        return;
    }

    // Mapear status antigos para novos
    const statusMap = {
        'REVIEW': 'TODO',
        'IN_REVIEW': 'TODO',
        'CANCELLED': 'BACKLOG',
        'CANCELED': 'BACKLOG',
    };

    for (const task of invalidTasks) {
        const oldStatus = task.status;
        let newStatus = statusMap[oldStatus] || 'TODO'; // Fallback para TODO

        console.log(`  📝 Tarefa "${task.title}" (${task.id})`);
        console.log(`     Status: "${oldStatus}" → "${newStatus}"`);

        await prisma.task.update({
            where: { id: task.id },
            data: { status: newStatus }
        });
    }

    console.log(`\n✅ ${invalidTasks.length} tarefas corrigidas!`);
}

fixInvalidTaskStatuses()
    .then(() => {
        console.log('\n🎉 Script finalizado com sucesso!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Erro ao corrigir tarefas:', error);
        process.exit(1);
    });
