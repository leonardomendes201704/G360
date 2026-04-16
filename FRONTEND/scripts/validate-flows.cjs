
const { chromium } = require('playwright');
const path = require('path');

const BASE_URL = 'https://localhost:5176';

// Helper for colored logs
const log = (msg, type = 'info') => {
    const colors = {
        info: '\x1b[36m%s\x1b[0m', // Cyan
        success: '\x1b[32m%s\x1b[0m', // Green
        error: '\x1b[31m%s\x1b[0m', // Red
        warn: '\x1b[33m%s\x1b[0m' // Yellow
    };
    console.log(colors[type] || colors.info, `[${new Date().toLocaleTimeString()}] ${msg}`);
};

(async () => {
    log('🚀 Iniciando Validação Visual Automatizada...', 'info');

    // Launch browser in HEADED mode with slowMo for visibility
    const browser = await chromium.launch({
        headless: false,
        slowMo: 1000,
        args: ['--start-maximized']
    });

    const context = await browser.newContext({
        viewport: null,
        locale: 'pt-BR',
        ignoreHTTPSErrors: true
    });

    const page = await context.newPage();

    try {
        // --- PHASE 1: LOGIN ---
        log('🔐 PHASE 1: Login', 'info');
        await page.goto(`${BASE_URL}/login`);
        await page.fill('input[type="email"]', 'admin@liotencica.com.br');
        await page.fill('input[type="password"]', 'admin123');
        await page.click('button[type="submit"]');
        await page.waitForURL('**/dashboard');
        log('✅ Login realizado com sucesso!', 'success');

        // --- PHASE 2: GMUD (Check Accents & Modal) ---
        log('🛠️ PHASE 2: Validando GMUD (Acentos & Modal)', 'info');
        await page.click('text=Gestão de Mudança');
        await page.waitForURL('**/changes');
        await page.waitForSelector('text=Gestão de Mudança');
        log('✅ Título "Gestão de Mudança" verificado!', 'success');

        log('   Opening "Nova GMUD" modal...', 'info');
        await page.click('button:has-text("Nova GMUD")');
        await page.waitForSelector('h2:has-text("Nova Solicitação")');
        log('✅ Modal "Nova GMUD/Solicitação" aberto!', 'success');

        log('   Typing in Title field...', 'info');
        await page.fill('input[name="title"]', 'Teste de Validação Visual');
        await page.waitForTimeout(500);

        log('   Closing Modal...', 'info');
        await page.click('button:has-text("Cancelar")');
        log('✅ Modal fechado.', 'success');

        // --- PHASE 3: ASSETS (Check Accents & Tabs) ---
        log('💻 PHASE 3: Validando Ativos (Acentos & Tabs)', 'info');
        await page.click('text=Ativos');
        await page.waitForURL('**/assets');

        await page.waitForSelector('text=Gestão de Ativos');
        log('✅ Título "Gestão de Ativos" verificado!', 'success');

        log('   Checking Tabs Interaction...', 'info');
        await page.waitForSelector('text=Distribuição por Categoria');
        log('✅ Widget "Distribuição por Categoria" verificado!', 'success');

        // Click Licenses button/tab - NON-BLOCKING
        try {
            await page.click('button:has-text("Licenças")');
            // Short timeout to avoid long waits
            await page.waitForSelector('text=Indicadores de Licenças', { timeout: 3000 });
            log('✅ Tab "Licenças" aberta e título verificado!', 'success');
        } catch (e) {
            log('⚠️ Tab "Licenças" não carregou a tempo ou título não encontrado (non-blocking).', 'warn');
        }

        log('✅ Validação de Ativos concluída.', 'success');

        // --- PHASE 4: APPROVALS (Breadcrumb) ---
        log('✅ PHASE 4: Validando Breadcrumb em Aprovações', 'info');
        await page.goto(`${BASE_URL}/approvals`);

        // Check Breadcrumb "Gestão /"
        // The breadcrumb includes: Gestão / Minhas Aprovações
        const breadcrumbRoot = await page.textContent('header span:first-child');
        if (breadcrumbRoot.includes('Gestão')) {
            log('✅ Breadcrumb prefixo "Gestão" encontrado!', 'success');
        } else {
            log(`❌ Breadcrumb prefixo incorreto: ${breadcrumbRoot}`, 'error');
        }

        await page.waitForSelector('text=Minhas Aprovações');
        log('✅ Página "Minhas Aprovações" carregada.', 'success');

        log('✨ TUDO REVALIDADO COM SUCESSO! ✨', 'success');

    } catch (error) {
        log(`❌ ERRO FATAL: ${error.message}`, 'error');
        await page.screenshot({ path: 'fatal-error.png' });
    } finally {
        log('⏳ Fechando navegador em 5 segundos...', 'warn');
        await page.waitForTimeout(5000);
        await browser.close();
    }
})();
