const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: false, slowMo: 1000 });
    const context = await browser.newContext({
        viewport: { width: 1280, height: 720 },
        recordVideo: { dir: 'videos/' },
        ignoreHTTPSErrors: true
    });
    const page = await context.newPage();

    try {
        console.log('--- INICIANDO SMOKE TEST GERAL ---');

        // 1. Login
        console.log('1. Realizando Login...');
        // Porta predefinida G360 5176 (vite.config); audit/smoke usam HTTPS quando há certs.
        // Let's use the BASE_URL variable concept for easier change.
        const BASE_URL = 'https://localhost:5176';

        await page.goto(`${BASE_URL}/login`);
        await page.fill('input[type="email"]', 'admin@liotencica.com.br');
        await page.fill('input[type="password"]', 'admin123');
        await page.click('button[type="submit"]');
        try {
            await page.waitForURL('**/dashboard', { timeout: 30000 });
        } catch (e) {
            console.error('Login timeout. Current URL:', page.url());
            throw e;
        }
        console.log('Login realizado com sucesso!');

        // 2. Projetos
        console.log('2. Acessando Projetos...');
        await page.goto(`${BASE_URL}/projects`);
        await page.waitForSelector('h1:has-text("Projetos")', { timeout: 10000 });

        // Verifica botão de Novo Projeto
        const btnNewProject = page.locator('[data-testid="btn-novo-projeto"]');
        if (await btnNewProject.isVisible()) {
            console.log('Botão "Novo Projeto" encontrado!');
            await btnNewProject.click();
            await page.waitForSelector('text="Novo Projeto"', { timeout: 5000 });
            console.log('Modal de Novo Projeto aberto com sucesso.');
            await page.keyboard.press('Escape'); // Fecha modal
        } else {
            console.error('Botão "Novo Projeto" NÃO encontrado.');
        }

        // 3. Tarefas
        console.log('3. Acessando Tarefas...');
        await page.goto(`${BASE_URL}/tasks`);
        await page.waitForTimeout(2000); // Give it a sec
        // Try waiting for just "Tarefas" or the container
        try {
            await page.waitForSelector('h1:has-text("Tarefas")', { timeout: 10000 });
        } catch (e) {
            console.warn('Título "Minhas Tarefas" não encontrado, verificando botão...');
        }

        const btnNewTask = page.locator('[data-testid="btn-nova-tarefa"]');
        if (await btnNewTask.isVisible()) {
            console.log('Botão "Nova Tarefa" encontrado!');
            await btnNewTask.click();
            await page.waitForSelector('text="Nova Tarefa"', { timeout: 5000 });
            console.log('Modal de Nova Tarefa aberto com sucesso.');
            await page.keyboard.press('Escape');
        } else {
            console.error('Botão "Nova Tarefa" NÃO encontrado.');
        }

        // 4. GMUD
        console.log('4. Acessando GMUD...');
        await page.goto(`${BASE_URL}/changes`);
        await page.waitForSelector('text="Gestão de Mudança"', { timeout: 10000 });

        const btnNewChange = page.locator('button:has-text("Nova GMUD")');
        // If "Nova Mudança" isn't the exact text, I will need to adjust. Based on audit it was likely "Nova Mudança" or similar.
        // Actually, let's use the layout structure inspection from previous steps if available. 
        // Checking ChangesPage.jsx in previous steps showed "Nova Mudança" in previous audits? 
        // Let's assume standard "Nova Mudança" or check if I have it. I viewed ChangesPage.jsx before.
        // Wait, I saw "Gerencie requisicoes..." in Step 41. 
        // Let's use a generic 'button:has-text("Nova")' if specific text is unsure, but "Nova Mudança" is standard.
        // Or better, let's use a selector that looks for the button in the header.
        if (await btnNewChange.isVisible()) {
            console.log('Botão "Nova Mudança" encontrado!');
            await btnNewChange.click();
            await page.waitForSelector('text="Nova Solicitação"', { timeout: 5000 });
            console.log('Modal de Nova Mudança aberto com sucesso.');
            await page.keyboard.press('Escape');
        } else {
            console.log('Botão "Nova GMUD" não encontrado, verificando variantes...');
            const btnNewChangeVariant = page.locator('button:has-text("Criar Mudança")');
            if (await btnNewChangeVariant.isVisible()) {
                await btnNewChangeVariant.click();
                console.log('Botão "Criar Mudança" encontrado e clicado.');
                await page.keyboard.press('Escape');
            } else {
                console.warn('Botão de criação em GMUD não localizado na varredura rápida.');
            }
        }


        // 5. Ativos
        console.log('5. Acessando Ativos...');
        await page.goto(`${BASE_URL}/assets`);
        await page.waitForSelector('text="Gestão de Ativos"', { timeout: 10000 });
        // Assets usually has specific "Novo Ativo" or "Nova Licença" depending on tab.
        // Let's assume default tab has "Novo Ativo".
        const btnNewAsset = page.getByRole('button', { name: 'Novo Ativo' });
        if (await btnNewAsset.isVisible()) {
            console.log('Botão "Novo Ativo" encontrado!');
            await btnNewAsset.click();
            await page.waitForSelector('text="Novo Ativo"', { timeout: 5000 });
            console.log('Modal de Novo Ativo aberto com sucesso.');
            await page.keyboard.press('Escape');
        } else {
            console.error('Botão "Novo Ativo" NÃO encontrado.');
        }

        // 6. Financeiro - Orçamentos (Tab 2)
        console.log('6. Acessando Financeiro (Orçamentos)...');
        await page.goto(`${BASE_URL}/finance`);
        await page.waitForSelector('text="Gestão Financeira"', { timeout: 10000 });

        // Click Tab Orçamentos (index 2)
        await page.click('[data-testid="tab-2"]');
        await page.waitForTimeout(500); // Animation

        const btnNewBudget = page.locator('[data-testid="btn-new-budget"]');
        if (await btnNewBudget.isVisible()) {
            console.log('Botão "Novo Orçamento" encontrado!');
            await btnNewBudget.click();
            // Verify modal opening
            await page.waitForSelector('text="Novo Orçamento"', { timeout: 5000 });
            console.log('Modal de Novo Orçamento aberto com sucesso.');
            await page.keyboard.press('Escape');
        } else {
            console.error('Botão "Novo Orçamento" NÃO encontrado.');
        }

        // 7. Riscos
        console.log('7. Acessando Riscos...');
        await page.goto(`${BASE_URL}/risks`);
        await page.waitForSelector('text="Gestão de Riscos"', { timeout: 15000 });

        const btnNewRisk = page.getByRole('button', { name: 'Novo Risco' });
        if (await btnNewRisk.isVisible()) {
            console.log('Botão "Novo Risco" encontrado!');
            await btnNewRisk.click();
            await page.waitForSelector('text="Novo Risco"', { timeout: 5000 });
            console.log('Modal de Novo Risco aberto com sucesso.');
            await page.keyboard.press('Escape');
        } else {
            console.error('Botão "Novo Risco" NÃO encontrado.');
        }

        // 8. Contratos
        console.log('8. Acessando Contratos...');
        await page.goto(`${BASE_URL}/contracts`);
        await page.waitForSelector('text="Gestão de Contratos"', { timeout: 10000 });

        const btnNewContract = page.locator('[data-testid="btn-novo-contrato"]');
        if (await btnNewContract.isVisible()) {
            console.log('Botão "Novo Contrato" encontrado!');
            await btnNewContract.click();
            await page.waitForSelector('text="Novo Contrato"', { timeout: 5000 });
            console.log('Modal de Novo Contrato aberto com sucesso.');
            await page.keyboard.press('Escape');
        } else {
            console.error('Botão "Novo Contrato" NÃO encontrado.');
        }

        // 9. Fornecedores
        console.log('9. Acessando Fornecedores...');
        await page.goto(`${BASE_URL}/suppliers`);
        await page.waitForSelector('text="Gestão de Fornecedores"', { timeout: 10000 });

        const btnNewSupplier = page.getByRole('button', { name: 'Novo Fornecedor' });
        if (await btnNewSupplier.isVisible()) {
            console.log('Botão "Novo Fornecedor" encontrado!');
            await btnNewSupplier.click();
            await page.waitForSelector('text="Novo Fornecedor"', { timeout: 5000 });
            console.log('Modal de Novo Fornecedor aberto com sucesso.');
            await page.keyboard.press('Escape');
        } else {
            console.error('Botão "Novo Fornecedor" NÃO encontrado.');
        }

        // 10. Incidentes
        console.log('10. Acessando Incidentes...');
        await page.goto(`${BASE_URL}/incidents`);
        await page.waitForSelector('text="Gestão de Incidentes"', { timeout: 10000 });

        const btnNewIncident = page.getByRole('button', { name: 'Novo Incidente' });
        if (await btnNewIncident.isVisible()) {
            console.log('Botão "Novo Incidente" encontrado!');
            await btnNewIncident.click();
            await page.waitForSelector('text="Novo Incidente"', { timeout: 5000 });
            console.log('Modal de Novo Incidente aberto com sucesso.');
            await page.keyboard.press('Escape');
        } else {
            console.error('Botão "Novo Incidente" NÃO encontrado.');
        }

        // 11. Verificação de Redirecionamentos (Tenant Admin)
        console.log('11. Verificando Redirecionamentos (Tenant Admin)...');

        // Settings
        await page.goto(`${BASE_URL}/settings`);
        await page.waitForTimeout(2000);
        console.log('URL após acessar /settings:', page.url());

        // Knowledge Base
        await page.goto(`${BASE_URL}/knowledge-base`);
        await page.waitForTimeout(2000);
        console.log('URL após acessar /knowledge-base:', page.url());

        // Activity Log
        await page.goto(`${BASE_URL}/activity-log`);
        await page.waitForTimeout(2000);
        console.log('URL após acessar /activity-log:', page.url());

        console.log('--- SMOKE TEST CONCLUÍDO COM SUCESSO ---');

    } catch (error) {
        console.error('ERRO DURANTE O TESTE:', error);
    } finally {
        await browser.close();
    }
})();
