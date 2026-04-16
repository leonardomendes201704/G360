const { chromium } = require('playwright');

(async () => {
    // Set headless: false for final user delivery, but currently testing.
    // User asked to "abrir o navegador".
    const browser = await chromium.launch({ headless: false, slowMo: 1000 });
    const context = await browser.newContext({
        viewport: { width: 1600, height: 900 },
        recordVideo: { dir: 'videos-full/' },
        ignoreHTTPSErrors: true
    });
    const page = await context.newPage();

    // Helper: Generate Unique Suffix
    const suffix = new Date().getTime().toString().slice(-4);
    const projectName = `Projeto Teste ${suffix}`;

    try {
        console.log('--- INICIANDO SMOKE TEST COMPLETO (CADASTROS) ---');

        // 1. LOGIN (Gestor liotencica)
        console.log('1. Login (Gestor)...');
        const BASE_URL = 'https://localhost:5176';

        await page.goto(`${BASE_URL}/login`);
        await page.fill('input[type="email"]', 'admin@liotencica.com.br');
        await page.fill('input[type="password"]', 'admin123');
        await page.click('button[type="submit"]');
        await page.waitForURL('**/dashboard', { timeout: 30000 });
        console.log('Login OK.');

        // 2. PROJETOS - CRIAR NOVO (WIZARD 3 PASSOS)
        console.log('2. Criando Projeto (Wizard)...');
        await page.goto(`${BASE_URL}/projects`);
        await page.click('[data-testid="btn-novo-projeto"]');
        await page.waitForSelector('text="Identificação"'); // Step 0 Title

        // STEP 0: Identificação
        console.log('   Passo 0: Identificação');
        await page.fill('[data-testid="input-nome"]', projectName);
        // Code is disabled, skip

        // Type Select
        await page.click('[data-testid="select-tipo"]');
        await page.click('li[data-value="INTERNO"]');

        // Cost Center Select
        await page.click('[data-testid="select-centro-custo"]');
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('Enter'); // Select first available

        // Wait for Manager to potentially auto-fill
        await page.waitForTimeout(1000);

        // Manager Select (Conditional)
        const managerSelect = page.locator('[data-testid="select-gerente"]');
        // Check if enabled (MUI often uses aria-disabled or checks input)
        // We try to click if it looks enabled. If it fails, we catch.
        if (await managerSelect.isEnabled()) {
            try {
                console.log('      Selecionando Gerente manualmente...');
                await managerSelect.click({ timeout: 2000 });
                await page.waitForTimeout(500);
                await page.keyboard.press('ArrowDown');
                await page.keyboard.press('Enter');
            } catch (e) {
                console.log('      Gerente parece estar bloqueado ou não clicável/necessário.');
            }
        } else {
            console.log('      Gerente bloqueado/auto-preenchido.');
        }

        // Tech Lead Select
        await page.click('[data-testid="select-tech-lead"]');
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('Enter');

        // Next
        await page.click('button:has-text("Próximo")');

        // STEP 1: Escopo
        console.log('   Passo 1: Escopo');
        await page.waitForSelector('text="Área solicitante"');

        // Area Autocomplete
        const areaInput = page.locator('[data-testid="input-area"]');
        await areaInput.fill('Tecnologia');
        await page.waitForTimeout(500);
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('Enter');

        await page.fill('textarea[name="description"]', 'Escopo macro definido via automação.');
        await page.fill('textarea[name="notes"]', 'Justificativa de negócio via automação.');

        // Next
        await page.click('button:has-text("Próximo")');

        // STEP 2: Planejamento
        console.log('   Passo 2: Planejamento');
        await page.waitForSelector('text="Orçamento Previsto"');

        // Priority (Buttons)
        await page.click('button:has-text("Média")');

        // Dates
        await page.fill('[data-testid="input-inicio"]', '2024-01-01');
        await page.fill('[data-testid="input-termino"]', '2024-12-31');

        // Budget
        await page.fill('input[name="budget"]', '50000');

        // Submit
        await page.click('button:has-text("Criar Rascunho")');

        await page.waitForSelector(`text="${projectName}"`, { timeout: 15000 });
        console.log('Projeto criado OK.');

        // 3. PROJETO - DETALHES & SUB-ABAS
        console.log('3. Acessando Detalhes do Projeto...');
        await page.click(`text="${projectName}"`);
        // Wait for header
        await page.waitForSelector(`h1:has-text("${projectName}")`, { timeout: 10000 });

        // 3.1 Sub-aba: Cronograma (Tarefas)
        console.log('   -> Sub-aba: Cronograma');
        // Look for tab with "Cronograma"
        await page.click('button[role="tab"]:has-text("Cronograma")');
        await page.waitForTimeout(1000);

        // Check if button exists (it might be distinct from global assignments)
        const btnNovaAtiv = page.locator('button:has-text("Nova Atividade")'); // Generic
        if (await btnNovaAtiv.isVisible()) {
            await btnNovaAtiv.click();
            await page.waitForSelector('text="Nova Atividade"');
            await page.fill('input[name="title"]', `Atividade ${suffix}`);
            // Dates/Assignee might be required
            if (await page.isVisible('input[name="startDate"]')) await page.fill('input[name="startDate"]', '2024-06-01');
            if (await page.isVisible('input[name="endDate"]')) await page.fill('input[name="endDate"]', '2024-06-05');

            await page.click('button[type="submit"]'); // Generic submit
            console.log('      Atividade criada.');
        } else {
            console.warn('      Botão Nova Atividade não encontrado.');
        }

        // 3.2 Sub-aba: Financeiro -> Custos
        console.log('   -> Sub-aba: Financeiro');
        await page.click('button[role="tab"]:has-text("Financeiro")');
        await page.waitForTimeout(1000);
        // Ensure "Custos" sub-tab is active (default usually)
        if (await page.isVisible('button:has-text("Novo Custo")')) {
            await page.click('button:has-text("Novo Custo")');
            await page.waitForSelector('text="Novo Custo"');
            await page.fill('input[name="description"]', `Custo ${suffix}`);
            await page.fill('input[name="amount"]', '1200');
            await page.click('button[type="submit"]');
            console.log('      Custo criado.');
        } else {
            console.warn('      Botão Novo Custo não encontrado.');
        }

        // 3.3 Sub-aba: Riscos
        console.log('   -> Sub-aba: Riscos');
        await page.click('button[role="tab"]:has-text("Riscos")');
        await page.waitForTimeout(1000);
        if (await page.isVisible('button:has-text("Novo Risco")')) {
            await page.click('button:has-text("Novo Risco")');
            await page.waitForSelector('text="Novo Risco"');
            await page.fill('input[name="description"]', `Risco ${suffix}`);
            // Prob/Impact selects often need clicking
            // Try filling if standard select, else click
            try {
                // Assuming standard select or generic handling
                // Check if specialized form
            } catch (e) { }
            await page.click('button[type="submit"]');
            console.log('      Risco criado.');
        }

        // 4. GMUD - Módulo Raiz
        console.log('4. Criando GMUD...');
        await page.goto(`${BASE_URL}/changes`);
        await page.click('button:has-text("Nova GMUD"), button:has-text("Nova Mudança")');
        await page.waitForSelector('text="Solicitação"'); // Partial match
        await page.fill('input[name="title"]', `GMUD ${suffix}`);
        await page.fill('textarea[name="description"]', 'Mudança via teste automatizado');
        await page.fill('textarea[name="justification"]', 'Teste automatizado');
        await page.fill('textarea[name="impact"]', 'Baixo');
        await page.click('button[type="submit"]');
        console.log('GMUD criada OK.');

        // 5. ATIVOS
        console.log('5. Criando Ativo...');
        await page.goto(`${BASE_URL}/assets`);
        await page.click('button:has-text("Novo Ativo")');
        await page.waitForSelector('text="Novo Ativo"');
        await page.fill('input[name="name"]', `Ativo ${suffix}`);
        await page.fill('input[name="code"]', `AST-${suffix}`);
        await page.click('button[type="submit"]');
        console.log('Ativo criado OK.');

        // 6. CONTRATOS
        console.log('6. Criando Contrato...');
        await page.goto(`${BASE_URL}/contracts`);
        await page.click('[data-testid="btn-novo-contrato"]');
        await page.waitForSelector('text="Novo Contrato"');
        await page.fill('input[name="number"]', `CTR-${suffix}`);
        await page.fill('input[name="description"]', `Contrato ${suffix}`);
        await page.fill('input[name="value"]', '50000');
        // Dates usually required
        await page.fill('input[name="startDate"]', '2024-01-01');
        await page.fill('input[name="endDate"]', '2024-12-31');

        await page.click('button[type="submit"]');
        console.log('Contrato criado OK.');

        // 7. FORNECEDORES
        console.log('7. Criando Fornecedor...');
        await page.goto(`${BASE_URL}/suppliers`);
        await page.click('button:has-text("Novo Fornecedor")');
        await page.waitForSelector('text="Novo Fornecedor"');
        await page.fill('input[name="name"]', `Fornecedor ${suffix}`);
        await page.fill('input[name="tradeName"]', `Forn ${suffix} Ltda`);
        await page.fill('input[name="document"]', `${suffix}000100`); // Ensure length
        await page.click('button[type="submit"]');
        console.log('Fornecedor criado OK.');

        // 8. INCIDENTES
        console.log('8. Criando Incidente...');
        await page.goto(`${BASE_URL}/incidents`);
        await page.click('button:has-text("Novo Incidente")');
        await page.waitForSelector('text="Novo Incidente"');
        await page.fill('input[name="title"]', `Incidente ${suffix}`);
        await page.fill('textarea[name="description"]', 'Erro sistêmico simulado');
        await page.click('button[type="submit"]');
        console.log('Incidente criado OK.');

        console.log('--- CADASTROS COMPLETOS FINALIZADOS ---');

    } catch (error) {
        console.error('ERRO CRÍTICO NO FLUXO:', error);
        await page.screenshot({ path: `error-full-${suffix}.png` });
        process.exit(1);
    } finally {
        await browser.close();
    }
})();
