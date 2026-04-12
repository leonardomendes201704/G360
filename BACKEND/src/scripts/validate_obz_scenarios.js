/**
 * Script de Validação - Módulo OBZ e Cenários
 * Executa testes básicos nos novos endpoints
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';

// Credenciais de teste do seed
const TEST_USER = {
    email: 'admin@g360.com.br',
    password: '123456'
};

let authToken = null;
let testBudgetId = null;
let testScenarioId = null;

const log = (msg, data = null) => {
    console.log(`\n✅ ${msg}`);
    if (data) console.log(JSON.stringify(data, null, 2));
};

const error = (msg, err) => {
    console.log(`\n❌ ${msg}`);
    if (err.response) {
        console.log('Status:', err.response.status);
        console.log('Data:', err.response.data);
    } else {
        console.log('Error:', err.message);
    }
};

async function login() {
    try {
        const response = await axios.post(`${BASE_URL}/auth/login`, TEST_USER);
        authToken = response.data.token;
        log('Login realizado com sucesso', { userId: response.data.user?.id });
        return true;
    } catch (err) {
        error('Falha no login', err);
        return false;
    }
}

async function getBudgets() {
    try {
        const response = await axios.get(`${BASE_URL}/budgets`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        const budgets = response.data;
        log(`Encontrados ${budgets.length} orçamentos`);

        if (budgets.length > 0) {
            testBudgetId = budgets[0].id;
            log(`Usando orçamento para testes: ${testBudgetId}`);
        }
        return budgets;
    } catch (err) {
        error('Falha ao buscar orçamentos', err);
        return [];
    }
}

async function testCreateScenarioFromMultiplier() {
    if (!testBudgetId) {
        console.log('\n⚠️  Sem orçamento para testar cenários');
        return null;
    }

    try {
        const response = await axios.post(
            `${BASE_URL}/finance/budgets/${testBudgetId}/scenarios/multiplier`,
            {
                name: 'Cenário Conservador (-10%)',
                multiplier: 0.9,
                description: 'Teste de corte de 10%'
            },
            { headers: { Authorization: `Bearer ${authToken}` } }
        );

        testScenarioId = response.data.id;
        log('Cenário criado com sucesso', {
            id: response.data.id,
            name: response.data.name,
            totalOpex: response.data.totalOpex,
            totalCapex: response.data.totalCapex
        });
        return response.data;
    } catch (err) {
        error('Falha ao criar cenário', err);
        return null;
    }
}

async function testGetScenarios() {
    if (!testBudgetId) return [];

    try {
        const response = await axios.get(
            `${BASE_URL}/finance/budgets/${testBudgetId}/scenarios`,
            { headers: { Authorization: `Bearer ${authToken}` } }
        );

        log(`Encontrados ${response.data.length} cenários para o orçamento`);
        return response.data;
    } catch (err) {
        error('Falha ao listar cenários', err);
        return [];
    }
}

async function testGetImpactAnalysis() {
    if (!testScenarioId) return null;

    try {
        const response = await axios.get(
            `${BASE_URL}/finance/scenarios/${testScenarioId}/impact`,
            { headers: { Authorization: `Bearer ${authToken}` } }
        );

        log('Análise de impacto gerada', {
            originalTotal: response.data.summary?.originalTotal,
            scenarioTotal: response.data.summary?.scenarioTotal,
            savingsOrExcess: response.data.summary?.savingsOrExcess,
            recommendations: response.data.recommendations?.length
        });
        return response.data;
    } catch (err) {
        error('Falha na análise de impacto', err);
        return null;
    }
}

async function testGetInsights() {
    if (!testBudgetId) return null;

    try {
        const response = await axios.get(
            `${BASE_URL}/finance/budgets/${testBudgetId}/insights`,
            { headers: { Authorization: `Bearer ${authToken}` } }
        );

        log('Insights OBZ gerados', {
            total: response.data.summary?.total,
            obzCompliance: response.data.obzAnalysis?.obzCompliance,
            risksCount: response.data.risks?.length,
            recommendationsCount: response.data.recommendations?.length
        });
        return response.data;
    } catch (err) {
        error('Falha ao gerar insights', err);
        return null;
    }
}

async function testDeleteScenario() {
    if (!testScenarioId) return;

    try {
        await axios.delete(
            `${BASE_URL}/finance/scenarios/${testScenarioId}`,
            { headers: { Authorization: `Bearer ${authToken}` } }
        );

        log('Cenário de teste deletado');
    } catch (err) {
        error('Falha ao deletar cenário', err);
    }
}

async function runTests() {
    console.log('========================================');
    console.log('  Validação do Módulo OBZ e Cenários  ');
    console.log('========================================');

    // 1. Login
    const loggedIn = await login();
    if (!loggedIn) {
        console.log('\n⛔ Testes abortados: falha no login');
        return;
    }

    // 2. Buscar orçamentos existentes
    await getBudgets();

    // 3. Criar cenário via multiplicador
    await testCreateScenarioFromMultiplier();

    // 4. Listar cenários
    await testGetScenarios();

    // 5. Análise de impacto
    await testGetImpactAnalysis();

    // 6. Insights OBZ
    await testGetInsights();

    // 7. Cleanup - deletar cenário de teste
    // await testDeleteScenario();

    console.log('\n========================================');
    console.log('  ✅ Validação concluída!');
    console.log('========================================\n');
}

runTests().catch(console.error);
