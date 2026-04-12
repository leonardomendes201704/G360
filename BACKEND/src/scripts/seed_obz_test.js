/**
 * Script de Seed - Orçamento de Teste para OBZ
 * Cria dados de teste para validar cenários e insights
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { prisma } = require('../config/database');

async function seed() {
    console.log('🌱 Criando dados de teste para OBZ...\n');

    try {
        // 1. Verificar/Criar Ano Fiscal 2026
        let fiscalYear = await prisma.fiscalYear.findFirst({ where: { year: 2026 } });
        if (!fiscalYear) {
            fiscalYear = await prisma.fiscalYear.create({
                data: {
                    year: 2026,
                    startDate: new Date('2026-01-01'),
                    endDate: new Date('2026-12-31'),
                    isClosed: false
                }
            });
            console.log('✅ Ano Fiscal 2026 criado');
        } else {
            console.log('ℹ️  Ano Fiscal 2026 já existe');
        }

        // 2. Buscar Conta Contábil
        let account = await prisma.accountingAccount.findFirst();
        if (!account) {
            account = await prisma.accountingAccount.create({
                data: {
                    code: '4.1.01',
                    name: 'Serviços de TI',
                    type: 'OPEX',
                    isActive: true
                }
            });
            console.log('✅ Conta Contábil criada');
        }

        // 3. Buscar Centro de Custo
        let costCenter = await prisma.costCenter.findFirst({ where: { isActive: true } });
        if (!costCenter) {
            const dept = await prisma.department.findFirst();
            if (dept) {
                costCenter = await prisma.costCenter.create({
                    data: {
                        code: 'CC-TI-001',
                        name: 'Infraestrutura TI',
                        departmentId: dept.id,
                        isActive: true
                    }
                });
                console.log('✅ Centro de Custo criado');
            }
        }

        // 4. Criar Orçamento 2026
        let budget = await prisma.budget.findFirst({ where: { fiscalYearId: fiscalYear.id } });
        if (!budget) {
            budget = await prisma.budget.create({
                data: {
                    fiscalYearId: fiscalYear.id,
                    name: 'Orçamento TI 2026',
                    description: 'Orçamento Base Zero para TI',
                    status: 'DRAFT',
                    version: 1
                }
            });
            console.log('✅ Orçamento 2026 criado');
        } else {
            console.log('ℹ️  Orçamento 2026 já existe');
        }

        // 5. Criar Itens de Orçamento com dados OBZ
        const existingItems = await prisma.budgetItem.count({ where: { budgetId: budget.id } });

        if (existingItems === 0) {
            const items = [
                {
                    budgetId: budget.id,
                    accountId: account.id,
                    costCenterId: costCenter?.id || null,
                    description: 'Cloud AWS - Produção',
                    type: 'OPEX',
                    jan: 15000, feb: 15000, mar: 16000, apr: 16000, may: 17000, jun: 17000,
                    jul: 18000, aug: 18000, sep: 19000, oct: 19000, nov: 20000, dec: 20000,
                    total: 210000,
                    justification: 'Infraestrutura crítica para operação do negócio. Crescimento projetado de 30% na demanda.',
                    priority: 'ESSENCIAL',
                    isNewExpense: false,
                    previousYearValue: 180000,
                    variancePercent: 16.67
                },
                {
                    budgetId: budget.id,
                    accountId: account.id,
                    costCenterId: costCenter?.id || null,
                    description: 'Licenças Microsoft 365',
                    type: 'OPEX',
                    jan: 8000, feb: 8000, mar: 8000, apr: 8000, may: 8000, jun: 8000,
                    jul: 8000, aug: 8000, sep: 8000, oct: 8000, nov: 8000, dec: 8000,
                    total: 96000,
                    justification: 'Licenciamento obrigatório para 200 colaboradores.',
                    priority: 'ESSENCIAL',
                    isNewExpense: false,
                    previousYearValue: 90000,
                    variancePercent: 6.67
                },
                {
                    budgetId: budget.id,
                    accountId: account.id,
                    costCenterId: costCenter?.id || null,
                    description: 'Treinamentos Técnicos',
                    type: 'OPEX',
                    jan: 5000, feb: 0, mar: 5000, apr: 0, may: 5000, jun: 0,
                    jul: 5000, aug: 0, sep: 5000, oct: 0, nov: 5000, dec: 0,
                    total: 30000,
                    justification: 'Capacitação da equipe em novas tecnologias (Kubernetes, IA).',
                    priority: 'IMPORTANTE',
                    isNewExpense: false,
                    previousYearValue: 25000,
                    variancePercent: 20.0
                },
                {
                    budgetId: budget.id,
                    accountId: account.id,
                    costCenterId: costCenter?.id || null,
                    description: 'Ferramenta de BI (novo)',
                    type: 'OPEX',
                    jan: 3000, feb: 3000, mar: 3000, apr: 3000, may: 3000, jun: 3000,
                    jul: 3000, aug: 3000, sep: 3000, oct: 3000, nov: 3000, dec: 3000,
                    total: 36000,
                    justification: 'Nova plataforma de Business Intelligence para dashboards executivos.',
                    priority: 'DESEJAVEL',
                    isNewExpense: true,
                    previousYearValue: null,
                    variancePercent: null
                }
            ];

            for (const item of items) {
                await prisma.budgetItem.create({ data: item });
            }
            console.log(`✅ ${items.length} itens de orçamento criados`);

            // Atualizar totais do orçamento
            const totalOpex = items.reduce((sum, i) => sum + i.total, 0);
            await prisma.budget.update({
                where: { id: budget.id },
                data: { totalOpex, totalCapex: 0 }
            });
            console.log(`✅ Totais atualizados: OPEX R$ ${totalOpex.toLocaleString()}`);
        } else {
            console.log(`ℹ️  Orçamento já possui ${existingItems} itens`);
        }

        console.log('\n========================================');
        console.log('  ✅ Seed OBZ concluído!');
        console.log(`  Budget ID: ${budget.id}`);
        console.log('========================================\n');

    } catch (error) {
        console.error('❌ Erro no seed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

seed();
