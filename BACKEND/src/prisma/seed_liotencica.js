const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { execSync } = require('child_process');
const path = require('path');
require('dotenv').config();

// Configurações
const CATALOG_SCHEMA = 'public';
const TENANT_NAME = 'Liotencica';
const TENANT_SLUG = 'liotencica';
const TENANT_SCHEMA = 'tenant_liotencica';

async function main() {
    console.log(`🌱 Iniciando Seed para o Tenant: ${TENANT_NAME} (${TENANT_SLUG})...`);

    // ==================== 1. CATALOGO (RAW QUERIES) ====================
    const catalogDbUrl = process.env.DATABASE_URL.replace(/\?schema=[^&]*/, `?schema=${CATALOG_SCHEMA}`);
    const catalogPrisma = new PrismaClient({ datasources: { db: { url: catalogDbUrl } } });

    try {
        console.log(`🔍 Verificando tenant no catálogo...`);

        const existing = await catalogPrisma.$queryRaw`
            SELECT * FROM tenants WHERE slug = ${TENANT_SLUG} LIMIT 1
        `;

        if (existing.length === 0) {
            console.log(`🆕 Tenant não encontrado. Criando...`);
            const now = new Date();
            await catalogPrisma.$executeRaw`
                INSERT INTO tenants (id, name, slug, schema_name, is_active, plan, max_users, created_at, updated_at)
                VALUES (gen_random_uuid(), ${TENANT_NAME}, ${TENANT_SLUG}, ${TENANT_SCHEMA}, true, 'ENTERPRISE', 100, ${now}, ${now})
            `;
            console.log(`✅ Tenant '${TENANT_NAME}' cadastrado no catálogo.`);
            await catalogPrisma.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS "${TENANT_SCHEMA}"`);
            console.log(`✅ Schema '${TENANT_SCHEMA}' verificado/criado.`);
        } else {
            console.log(`✅ Tenant '${TENANT_NAME}' já existe no catálogo.`);
            await catalogPrisma.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS "${TENANT_SCHEMA}"`);
        }

    } catch (error) {
        console.error('❌ Erro ao acessar catálogo:', error);
        process.exit(1);
    } finally {
        await catalogPrisma.$disconnect();
    }

    // ==================== 2. MIGRATIONS ====================
    console.log(`🛠️ Rodando migrations para o schema '${TENANT_SCHEMA}'...`);
    const tenantDbUrl = process.env.DATABASE_URL.replace(/\?schema=[^&]*/, `?schema=${TENANT_SCHEMA}`);

    try {
        const schemaPath = path.resolve(__dirname, 'schema.prisma');
        execSync(`npx prisma migrate deploy --schema="${schemaPath}"`, {
            env: { ...process.env, DATABASE_URL: tenantDbUrl },
            stdio: 'inherit'
        });
        console.log(`✅ Migrations aplicadas com sucesso.`);
    } catch (e) {
        console.error('❌ Erro ao rodar migrations:', e);
        process.exit(1);
    }

    // ==================== 3. TENANT DATA (TYPED MODELS) ====================
    const prisma = new PrismaClient({ datasources: { db: { url: tenantDbUrl } } });

    try {
        console.log(`🚀 Conectado ao schema '${TENANT_SCHEMA}'. Iniciando população de dados...`);

        // CORE (Roles, Depts, CCs, Users)
        const roles = {};
        for (const r of ['Super Admin', 'Manager', 'Collaborator']) {
            roles[r] = await prisma.role.upsert({
                where: { name: r },
                update: {},
                create: { name: r, description: `${r} role` }
            });
        }

        const departments = [];
        for (let i = 1; i <= 10; i++) {
            const dept = await prisma.department.upsert({
                where: { code: `DEPT-${i.toString().padStart(3, '0')}` },
                update: {},
                create: {
                    name: `Departamento ${i}`,
                    code: `DEPT-${i.toString().padStart(3, '0')}`,
                    budget: 100000 + (i * 10000)
                }
            });
            departments.push(dept);
        }

        const costCenters = [];
        for (let i = 1; i <= 10; i++) {
            const cc = await prisma.costCenter.upsert({
                where: { code: `CC-${i.toString().padStart(3, '0')}` },
                update: {},
                create: {
                    name: `Centro de Custo ${i}`,
                    code: `CC-${i.toString().padStart(3, '0')}`,
                    departmentId: departments[i % 10].id
                }
            });
            costCenters.push(cc);
        }

        const passwordStart = await bcrypt.hash('12345678@aA', 10);

        const adminUser = await prisma.user.upsert({
            where: { email: `admin@${TENANT_SLUG}.com` },
            update: {},
            create: {
                name: 'Admin Liotencica',
                email: `admin@${TENANT_SLUG}.com`,
                password: passwordStart,
                roles: { connect: { id: roles['Super Admin'].id } },
                departmentId: departments[0].id,
                costCenterId: costCenters[0].id
            }
        });

        const users = [adminUser];
        for (let i = 1; i <= 10; i++) {
            const user = await prisma.user.upsert({
                where: { email: `user${i}@${TENANT_SLUG}.com` },
                update: {},
                create: {
                    name: `Usuário Teste ${i}`,
                    email: `user${i}@${TENANT_SLUG}.com`,
                    password: passwordStart,
                    roles: { connect: { id: roles['Collaborator'].id } },
                    departmentId: departments[i % 10].id,
                    costCenterId: costCenters[i % 10].id
                }
            });
            users.push(user);
        }
        console.log(`✅ Core data created/verified.`);

        // SUPPLIERS & CONTRACTS
        const suppliers = [];
        for (let i = 1; i <= 10; i++) {
            const supplier = await prisma.supplier.upsert({
                where: { document: `00000000000${i}` },
                update: {},
                create: {
                    name: `Fornecedor ${i} Ltda`,
                    tradeName: `Fornecedor ${i}`,
                    document: `00000000000${i}`,
                    documentType: 'CNPJ',
                    classification: 'FORNECEDOR',
                    category: 'TECNOLOGIA',
                    status: 'ATIVO'
                }
            });
            suppliers.push(supplier);
        }

        const contracts = [];
        for (let i = 1; i <= 10; i++) {
            const num = `CTR-2026-${i.toString().padStart(3, '0')}`;
            const exists = await prisma.contract.findFirst({ where: { number: num } });

            if (!exists) {
                const contract = await prisma.contract.create({
                    data: {
                        number: num,
                        supplierId: suppliers[i % 10].id,
                        description: `Contrato de Prestação de Serviços ${i}`,
                        type: 'PRESTACAO_SERVICO',
                        value: 12000 * i,
                        startDate: new Date(),
                        endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
                        status: 'ACTIVE',
                        costCenterId: costCenters[i % 10].id,
                        addendums: {
                            create: [{
                                number: `AD-01`,
                                description: 'Aditivo de prazo',
                                signatureDate: new Date(),
                                newEndDate: new Date(new Date().setFullYear(new Date().getFullYear() + 2))
                            }]
                        },
                        expenses: {
                            create: [{
                                description: `Pagamento Mensal ${i}`,
                                amount: 1000,
                                date: new Date(),
                                costCenterId: costCenters[i % 10].id,
                                type: 'OPERACIONAL',
                                createdBy: adminUser.id
                            }]
                        }
                    }
                });
                contracts.push(contract);
            }
        }
        console.log(`✅ Suppliers & Contracts created.`);

        // ASSETS
        const cats = await prisma.assetCategory.findMany();
        let hwCat = cats.find(c => c.type === 'HARDWARE');
        if (!hwCat) hwCat = await prisma.assetCategory.create({ data: { name: 'Hardware Default', type: 'HARDWARE' } });

        for (let i = 1; i <= 10; i++) {
            const code = `AST-${i.toString().padStart(4, '0')}`;
            await prisma.asset.upsert({
                where: { code },
                update: {},
                create: {
                    code,
                    name: `Notebook Dell Latitude 54${i}0`,
                    categoryId: hwCat.id,
                    status: 'PROPRIO',
                    acquisitionValue: 5000,
                    location: 'Matriz',
                    assignedTo: users[i % 10].id,
                    supplierId: suppliers[0].id,
                    maintenances: {
                        create: [{
                            type: 'PREVENTIVA',
                            description: 'Limpeza e troca de pasta térmica',
                            startDate: new Date(),
                            status: 'COMPLETED',
                            cost: 200
                        }, {
                            type: 'CORRETIVA',
                            description: 'Troca de teclado',
                            startDate: new Date(),
                            status: 'PENDING',
                            cost: 450
                        }]
                    }
                }
            });
        }
        console.log(`✅ Assets created.`);

        // PROJECTS
        for (let i = 1; i <= 10; i++) {
            const code = `PRJ-2026-${i.toString().padStart(3, '0')}`;
            const exists = await prisma.project.findUnique({ where: { code } });

            if (!exists) {
                await prisma.project.create({
                    data: {
                        code,
                        name: `Projeto Inovação ${i}`,
                        type: 'SOFTWARE',
                        status: 'IN_PROGRESS',
                        priority: 'HIGH',
                        managerId: users[1].id,
                        techLeadId: users[2].id,
                        departmentId: departments[i % 10].id,
                        costCenterId: costCenters[i % 10].id,
                        budget: 500000,

                        // FIX: removed creatorId, changed assigneeId to connect
                        tasks: {
                            create: [
                                {
                                    title: 'Levantamento de Requisitos',
                                    status: 'DONE',
                                    assignee: { connect: { id: users[3].id } }
                                },
                                {
                                    title: 'Desenvolvimento Backend',
                                    status: 'IN_PROGRESS',
                                    assignee: { connect: { id: users[4].id } }
                                },
                                {
                                    title: 'Testes QA',
                                    status: 'TODO',
                                    assignee: { connect: { id: users[5].id } }
                                }
                            ]
                        },
                        members: {
                            create: [
                                { userId: users[3].id, role: 'DEVELOPER' },
                                { userId: users[4].id, role: 'ARCHITECT' }
                            ]
                        },
                        risks: {
                            create: [
                                { description: 'Risco de atraso na entrega de insumos', impact: 'ALTO', probability: 'MEDIA', status: 'OPEN' }
                            ]
                        },
                        proposals: {
                            create: [
                                { supplierId: suppliers[i % 10].id, value: 50000, status: 'APROVADA', description: 'Proposta de Desenvolvimento' }
                            ]
                        },
                        costs: {
                            create: [
                                { description: 'Licença de Software', type: 'CAPEX', amount: 5000, date: new Date(), createdBy: adminUser.id }
                            ]
                        },
                        minutes: {
                            create: [
                                { title: 'Kickoff Meeting', date: new Date(), fileUrl: 'http://linkur.com', fileName: 'kickoff.pdf', participants: 'All team' }
                            ]
                        },
                        followUps: {
                            create: [
                                { description: 'Validar arquitetura com segurança', date: new Date(), status: 'PENDING', authorId: adminUser.id }
                            ]
                        }
                    }
                });
            }
        }
        console.log(`✅ Projects created.`);

        // INCIDENTS
        const incCat = await prisma.incidentCategory.upsert({
            where: { name: 'Software' },
            update: {},
            create: { name: 'Software', description: 'Issues with software' }
        });

        for (let i = 1; i <= 10; i++) {
            const code = `INC-2026-${i.toString().padStart(4, '0')}`;
            const exists = await prisma.incident.findUnique({ where: { code } });

            if (!exists) {
                await prisma.incident.create({
                    data: {
                        code,
                        title: `Erro no Sistema ERP - Módulo ${i}`,
                        description: `Usuário relata lentidão ao acessar o módulo ${i}`,
                        categoryId: incCat.id,
                        impact: 'MEDIO',
                        urgency: 'ALTA',
                        priority: 'P2',
                        status: 'IN_PROGRESS',
                        reporterId: users[i % 10].id,
                        assigneeId: users[1].id,

                        comments: {
                            create: [
                                { content: 'Analisando logs do servidor...', userId: users[1].id }
                            ]
                        },
                        history: {
                            create: [
                                { action: 'STATUS_CHANGE', oldValue: 'OPEN', newValue: 'IN_PROGRESS', userId: users[1].id }
                            ]
                        }
                    }
                });
            }
        }
        console.log(`✅ Incidents created.`);

        // Corporate Risks
        for (let i = 1; i <= 10; i++) {
            const code = `CR-2026-${i.toString().padStart(3, '0')}`;
            const exists = await prisma.corporateRisk.findUnique({ where: { code } });

            if (!exists) {
                await prisma.corporateRisk.create({
                    data: {
                        code,
                        title: `Risco de Segurança da Informação ${i}`,
                        description: 'Possibilidade de vazamento de dados sensíveis',
                        category: 'SEGURANCA',
                        probability: 'BAIXA',
                        impact: 'ALTO',
                        severity: 15,
                        status: 'MONITORAMENTO',
                        ownerId: users[1].id,
                        mitigationTasks: {
                            create: [
                                { title: 'Revisar políticas de acesso', creatorId: users[1].id, status: 'TODO' }
                            ]
                        }
                    }
                });
            }
        }
        console.log(`✅ Corporate Risks created.`);

        // BUDGETS
        const fy2026 = await prisma.fiscalYear.upsert({
            where: { year: 2026 },
            update: {},
            create: { year: 2026, startDate: new Date('2026-01-01'), endDate: new Date('2026-12-31') }
        });

        const budgetExists = await prisma.budget.findFirst({ where: { fiscalYearId: fy2026.id } });
        let budget = budgetExists;

        if (!budget) {
            budget = await prisma.budget.create({
                data: {
                    fiscalYearId: fy2026.id,
                    name: 'Orçamento TI 2026',
                    totalCapex: 1000000,
                    totalOpex: 500000,
                    status: 'APPROVED'
                }
            });
        }

        const acc = await prisma.accountingAccount.upsert({
            where: { code: '4.1.01.001' },
            update: {},
            create: { code: '4.1.01.001', name: 'Despesas de Pessoal', type: 'DESPESA', isActive: true }
        });

        const itemCount = await prisma.budgetItem.count({ where: { budgetId: budget.id } });
        if (itemCount < 10) {
            for (let i = 1; i <= 10; i++) {
                await prisma.budgetItem.create({
                    data: {
                        budgetId: budget.id,
                        accountId: acc.id,
                        costCenterId: costCenters[i % 10].id,
                        type: 'OPEX',
                        total: 120000,
                        jan: 10000, feb: 10000, mar: 10000, apr: 10000, may: 10000, jun: 10000,
                        jul: 10000, aug: 10000, sep: 10000, oct: 10000, nov: 10000, dec: 10000
                    }
                });
            }
        }
        console.log(`✅ Budgets created.`);

    } catch (e) {
        console.error('❌ Erro durante população:', e);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
