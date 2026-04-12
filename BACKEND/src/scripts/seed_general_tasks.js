const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const getRandomArrayElement = (arr) => arr[Math.floor(Math.random() * arr.length)];
const TASK_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'];

async function main() {
    console.log('📝 Seeding General Tasks...');

    const users = await prisma.user.findMany();
    if (users.length === 0) {
        console.error('❌ No users found.');
        return;
    }
    const userIds = users.map(u => u.id);

    for (let u = 0; u < userIds.length; u++) {
        const userId = userIds[u];

        console.log(`Creating tasks for user index ${u}...`);

        // Create 8 tasks per user
        for (let t = 0; t < 8; t++) {
            const isPersonal = Math.random() > 0.5;

            await prisma.task.create({
                data: {
                    title: isPersonal
                        ? `Pessoal: Lembrete ${t + 1}`
                        : `Corporativo: Análise ${t + 1}`,
                    description: 'Tarefa de teste gerada por script.',
                    status: getRandomArrayElement(['TODO', 'IN_PROGRESS', 'DONE']),
                    priority: getRandomArrayElement(TASK_PRIORITIES),
                    dueDate: new Date(new Date().setDate(new Date().getDate() + getRandomInt(-5, 20))),
                    creatorId: userId,
                    assigneeId: isPersonal ? userId : getRandomArrayElement(userIds),
                    isPersonal: isPersonal,
                    labels: {
                        create: [
                            { name: isPersonal ? 'Pessoal' : 'Admin', color: isPersonal ? '#4caf50' : '#f44336' }
                        ]
                    },
                    comments: {
                        create: [
                            { userId: getRandomArrayElement(userIds), content: 'Atualização sobre o andamento.' }
                        ]
                    }
                }
            });
        }
    }

    console.log('✅ Tasks Seeded!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
