
const { chromium } = require('playwright');

const BASE_URL = 'https://localhost:5173';

const log = (msg, type = 'info') => {
    const colors = { info: '\x1b[36m%s\x1b[0m', success: '\x1b[32m%s\x1b[0m', error: '\x1b[31m%s\x1b[0m', warn: '\x1b[33m%s\x1b[0m' };
    console.log(colors[type] || colors.info, `[${new Date().toLocaleTimeString()}] ${msg}`);
};

(async () => {
    log('🚀 Iniciando Auditoria: Projetos e Sub-abas...', 'info');
    const browser = await chromium.launch({ headless: false, slowMo: 1000, args: ['--start-maximized'] });
    const context = await browser.newContext({ viewport: null, locale: 'pt-BR', ignoreHTTPSErrors: true });
    const page = await context.newPage();

    try {
        // LOGIN
        await page.goto(`${BASE_URL}/login`);
        await page.fill('input[type="email"]', 'admin@liotencica.com.br');
        await page.fill('input[type="password"]', 'admin123');
        await page.click('button[type="submit"]');
        await page.waitForURL('**/dashboard');
        log('✅ Login realizado.', 'success');

        // NAVIGATE TO PROJECTS
        await page.click('text=Projetos');
        await page.waitForURL('**/projects');

        // OPEN WIZARD
        log('🛠️ Criando Projeto...', 'info');
        await page.click('button[data-testid="btn-novo-projeto"]');
        await page.waitForSelector('text=Identificação');

        // STEP 0
        await page.fill('input[data-testid="input-nome"]', 'Projeto Audit ' + Date.now());
        await page.click('[data-testid="select-tipo"]');
        await page.click('li[data-value="INTERNO"]');

        // COST CENTER
        await page.click('[data-testid="select-centro-custo"]');
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(500); // Allow react state update

        // MANAGER LOGIC
        const managerSelect = page.locator('[data-testid="select-gerente"]');
        const managerState = await managerSelect.getAttribute('class');

        if (managerState && managerState.includes('Mui-disabled')) {
            log('   🔒 Gerente bloqueado (auto-seleção).', 'info');
        } else {
            log('   👉 Selecionando Gerente manual...', 'info');
            await managerSelect.click();
            await page.keyboard.press('ArrowDown');
            await page.keyboard.press('Enter');
        }

        // TECH LEAD
        await page.click('[data-testid="select-tech-lead"]');
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('Enter');

        await page.click('button:has-text("Próximo")');

        // STEP 1
        await page.waitForSelector('text=Escopo e Justificativa');
        await page.fill('textarea[name="description"]', 'Teste automatizado.');
        await page.fill('textarea[name="notes"]', 'Teste.');
        await page.click('button:has-text("Próximo")');

        // STEP 2
        await page.waitForSelector('text=Planejamento');
        await page.click('button:has-text("Média")');
        const today = new Date().toISOString().split('T')[0];
        const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        await page.fill('input[name="startDate"]', today);
        await page.fill('input[name="endDate"]', nextMonth);
        await page.fill('input[name="budget"]', '5000');

        await page.click('button:has-text("Criar Rascunho")');
        // Wait for modal to close / list to refresh
        try {
            await page.waitForSelector('div.pl-page-header-card', { timeout: 5000 });
            log('✅ Projeto criado.', 'success');
        } catch (e) {
            log('⚠️ Timeout esperando lista, mas tentando prosseguir...', 'warn');
        }

        // OPEN DETAILS (Click first row)
        await page.waitForTimeout(1000);
        await page.waitForSelector('table tbody tr:first-child', { state: 'visible', timeout: 10000 });
        await page.click('table tbody tr:first-child');
        await page.waitForURL('**/projects/*');
        log('✅ Detalhes abertos.', 'success');

        // TABS CHECK
        const tabs = ['Visão Geral', 'Cronograma', 'Riscos', 'Atas', 'Financeiro', 'Propostas', 'Equipes', 'Follow-up'];
        const results = [];

        for (const label of tabs) {
            try {
                // Find tabs using flexible locator
                const tabBtn = page.locator(`button[role="tab"]`).filter({ hasText: label });
                if (await tabBtn.count() > 0) {
                    await tabBtn.first().click();
                    await page.waitForTimeout(500); // Visual pause
                    results.push({ label, status: 'OK' });
                    log(`   ✅ Aba "${label}" ativa.`, 'success');
                } else {
                    results.push({ label, status: 'MISSING' });
                    log(`   ❌ Aba "${label}" não encontrada.`, 'error');
                }
            } catch (e) {
                results.push({ label, status: 'ERROR' });
                log(`   ⚠️ Erro na aba "${label}": ${e.message}`, 'error');
            }
        }

        log('✨ Auditoria Finalizada.', 'success');

    } catch (err) {
        log(`❌ FALHA GERAL: ${err.message}`, 'error');
        console.error(err);
        await page.screenshot({ path: 'audit-final-failure.png' });
    } finally {
        await browser.close();
    }
})();
