const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
// const { faker } = require('@faker-js/faker'); // Removed dependency

// Simple randomizers if faker is not installed, but let's assume standard JS Math for simplicity to avoid dependencies issues if not present.
// Actually, using a few helper functions is safer than assuming a library.

const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const getRandomArrayElement = (arr) => arr[Math.floor(Math.random() * arr.length)];
const getRandomDate = (start, end) => new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));

const PROJECT_STATUSES = ['PLANNING', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD'];
const TASK_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'];
const RISK_LEVELS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const GMUD_STATUSES = ['DRAFT', 'PENDING', 'APPROVED', 'EXECUTED'];

async function main() {
    console.log('🌱 Starting comprehensive data seed...');

    // 1. Fetch Users
    const users = await prisma.user.findMany();
    if (users.length === 0) {
        console.error('❌ No users found. Please run basic auth seed first.');
        return;
    }
    const userIds = users.map(u => u.id);
    console.log(`ℹ️ Found ${users.length} users.`);

    // 2. Create Departments & Cost Centers
    console.log('Creating Departments and Cost Centers...');
    const dept = await prisma.department.create({
        data: {
            name: 'Tecnologia da Informação ' + getRandomInt(100, 999),
            code: 'IT-' + getRandomInt(100, 999),
            directorId: getRandomArrayElement(userIds)
        }
    });

    const costCenter = await prisma.costCenter.create({
        data: {
            name: 'Infraestrutura ' + getRandomInt(100, 999),
            code: 'CC-' + getRandomInt(1000, 9999),
            departmentId: dept.id,
            managerId: getRandomArrayElement(userIds)
        }
    });

    // 3. Create Suppliers & Contracts
    console.log('Creating Suppliers and Contracts...');
    const suppliers = [];
    for (let i = 0; i < 5; i++) {
        suppliers.push(await prisma.supplier.create({
            data: {
                name: `Fornecedor Teste ${i + 1}`,
                document: `CNPJ-${getRandomInt(100000, 999999)}`,
                documentType: 'CNPJ',
                email: `contato@fornecedor${i + 1}.com`,
                classification: 'Serviços'
            }
        }));
    }

    const contracts = [];
    for (let i = 0; i < 5; i++) {
        contracts.push(await prisma.contract.create({
            data: {
                number: `CNT-${getRandomInt(1000, 9999)}`,
                description: `Contrato de Serviços TI ${i + 1}`,
                supplierId: getRandomArrayElement(suppliers).id,
                costCenterId: costCenter.id,
                value: getRandomInt(10000, 50000),
                startDate: new Date(),
                endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
                responsibleId: getRandomArrayElement(userIds),
                type: 'Serviços',
                status: 'ACTIVE'
            }
        }));
    }

    // 4. Create Finance (Fiscal Year, Budget, Expenses)
    console.log('Creating Finance Data...');
    const year = 2025 + getRandomInt(1, 100); // Unique year to avoid collision
    const fiscalYear = await prisma.fiscalYear.create({
        data: {
            year: year,
            startDate: new Date(`${year}-01-01`),
            endDate: new Date(`${year}-12-31`)
        }
    });

    const account = await prisma.accountingAccount.create({
        data: { code: `ACC-${getRandomInt(1000, 9999)}`, name: 'Despesas Gerais', type: 'OPEX' }
    });

    const budget = await prisma.budget.create({
        data: {
            fiscalYearId: fiscalYear.id,
            name: `Orçamento TI ${year}`,
            status: 'APPROVED',
            totalOpex: 500000,
            totalCapex: 100000,
            items: {
                create: {
                    accountId: account.id,
                    costCenterId: costCenter.id,
                    type: 'OPEX',
                    total: 120000,
                    jan: 10000, feb: 10000, mar: 10000, apr: 10000, may: 10000, jun: 10000,
                    jul: 10000, aug: 10000, sep: 10000, oct: 10000, nov: 10000, dec: 10000
                }
            }
        }
    });

    // 5. Create Assets
    console.log('Creating Assets...');
    const catHw = await prisma.assetCategory.create({ data: { name: 'Hardware', type: 'Physical' } });
    const catSw = await prisma.assetCategory.create({ data: { name: 'Software License', type: 'License' } });

    for (let i = 0; i < 10; i++) {
        await prisma.asset.create({
            data: {
                name: `Laptop Dell Latitude ${getRandomInt(5000, 7000)}`,
                code: `AST-${getRandomInt(10000, 99999)}`,
                status: 'IN_USE',
                categoryId: catHw.id,
                costCenterId: costCenter.id,
                acquisitionValue: 5000,
                assignedTo: getRandomArrayElement(userIds)
            }
        });
    }

    for (let i = 0; i < 5; i++) {
        await prisma.softwareLicense.create({
            data: {
                name: `Licença Adobe Creative Cloud - User ${i}`,
                vendor: 'Adobe',
                licenseType: 'ASSINATURA',
                quantity: 1,
                expirationDate: new Date(new Date().setDate(new Date().getDate() + getRandomInt(5, 60))) // Expiring soon
            }
        });
    }

    // 6. Create Projects (Heavy data)
    console.log('Creating 10 Projects with full data...');
    for (let p = 0; p < 10; p++) {
        const startDate = getRandomDate(new Date('2024-01-01'), new Date('2024-06-01'));
        const endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + 6);

        const project = await prisma.project.create({
            data: {
                name: `Projeto ${p + 1} - Migração Sistema`,
                code: `PRJ-${getRandomInt(10000, 99999)}`,
                description: 'Projeto estratégico para atualização tecnológica.',
                type: 'Strategic', // FIXED: Added required field
                status: getRandomArrayElement(PROJECT_STATUSES),
                priority: 'HIGH',
                managerId: getRandomArrayElement(userIds),
                departmentId: dept.id,
                startDate: startDate,
                endDate: endDate,
                budget: 100000
            }
        });

        // Members (Unique)
        const shuffledUsers = [...userIds].sort(() => 0.5 - Math.random());
        const selectedMembers = shuffledUsers.slice(0, 2); // Pick 2 unique

        for (const userId of selectedMembers) {
            await prisma.projectMember.create({
                data: {
                    projectId: project.id,
                    userId: userId,
                    role: 'DEVELOPER'
                }
            });
        }

        // Risks
        for (let r = 0; r < 5; r++) {
            await prisma.projectRisk.create({
                data: {
                    projectId: project.id,
                    description: `Risco de atraso na entrega do módulo ${r + 1}`,
                    impact: getRandomArrayElement(RISK_LEVELS),
                    probability: getRandomArrayElement(RISK_LEVELS),
                    status: 'OPEN'
                }
            });
        }

        // Follow ups
        for (let f = 0; f < 5; f++) {
            await prisma.projectFollowUp.create({
                data: {
                    projectId: project.id,
                    date: new Date(),
                    authorId: getRandomArrayElement(userIds),
                    status: 'Green',
                    highlights: 'Equipe performando bem.',
                    nextSteps: 'Iniciar testes de carga.'
                }
            });
        }

        // Tasks
        for (let t = 0; t < 8; t++) {
            await prisma.projectTask.create({
                data: {
                    projectId: project.id,
                    title: `Implementar Feature ${t + 1}`,
                    status: getRandomArrayElement(['TODO', 'IN_PROGRESS', 'DONE']),
                    priority: getRandomArrayElement(TASK_PRIORITIES),
                    assigneeId: getRandomArrayElement(userIds),
                    startDate: new Date(),
                    endDate: new Date(new Date().setDate(new Date().getDate() + 7))
                }
            });
        }

        // Expenses per project
        await prisma.expense.create({
            data: {
                description: 'Aquisição de Servidor Project',
                amount: 5000,
                date: new Date(),
                type: 'CAPEX',
                status: 'PAID',
                projectId: project.id,
                costCenterId: costCenter.id,
                accountId: account.id,
                createdBy: getRandomArrayElement(userIds)
            }
        });
    }

    // 7. GMUD
    console.log('Creating Change Requests...');
    for (let g = 0; g < 5; g++) {
        await prisma.changeRequest.create({
            data: {
                code: `GMUD-${getRandomInt(1000, 9999)}`,
                title: `Atualização de Firmware Switch Core ${g}`,
                description: 'Aplicação de patch de segurança crítico.',
                justification: 'Vulnerabilidade exposta.',
                type: 'Normal',
                riskLevel: 'High',
                impact: 'Medium',
                status: getRandomArrayElement(GMUD_STATUSES),
                requesterId: getRandomArrayElement(userIds),
                scheduledStart: new Date(),
                scheduledEnd: new Date(new Date().setHours(new Date().getHours() + 4)),
                approvers: {
                    create: {
                        userId: getRandomArrayElement(userIds),
                        role: 'CAB',
                        status: 'PENDING'
                    }
                }
            }
        });
    }

    // 8. General Tasks (Non-Project)
    console.log('Creating General & Personal Tasks...');
    for (let u = 0; u < userIds.length; u++) {
        const userId = userIds[u];

        // Create 5-8 tasks per user
        const taskCount = getRandomInt(5, 8);
        for (let t = 0; t < taskCount; t++) {
            const isPersonal = Math.random() > 0.5;

            await prisma.task.create({
                data: {
                    title: isPersonal
                        ? `Tarefa Pessoal: Revisar anotações ${t}`
                        : `Tarefa Corporativa: Relatório ${t}`,
                    description: 'Tarefa gerada automaticamente para testes.',
                    status: getRandomArrayElement(['TODO', 'IN_PROGRESS', 'DONE', 'CANCELLED']),
                    priority: getRandomArrayElement(TASK_PRIORITIES),
                    dueDate: new Date(new Date().setDate(new Date().getDate() + getRandomInt(-5, 15))), // Some overdue, some future
                    creatorId: userId,
                    assigneeId: isPersonal ? userId : getRandomArrayElement(userIds), // Assign to self or random
                    isPersonal: isPersonal,
                    labels: {
                        create: [
                            { name: isPersonal ? 'Pessoal' : 'Trabalho', color: isPersonal ? '#4caf50' : '#2196f3' }
                        ]
                    }
                }
            });
        }
    }

    console.log('✅ Seeding complete!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
