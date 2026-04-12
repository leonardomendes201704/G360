require('dotenv').config({ path: '.env.test' });

// Configurações globais para os testes de integração
process.env.NODE_ENV = 'test';

// Importa e inicializa qualquer dependência global se precisar
beforeAll(() => {
    // Configurações que rodarão antes de todos os testes de integração
});

afterAll(async () => {
    const TenantManager = require('../../src/config/tenant-manager');
    await TenantManager.disconnectAll();
});
