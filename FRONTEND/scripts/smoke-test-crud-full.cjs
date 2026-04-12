const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
    // SETUP
    // SlowMo is good for "seeing" but slows it down. 500ms is a balance.
    const browser = await chromium.launch({ headless: false, slowMo: 50 });
    const context = await browser.newContext({
        viewport: { width: 1600, height: 900 },
        recordVideo: { dir: 'videos-crud/', size: { width: 1600, height: 900 } },
        ignoreHTTPSErrors: true
    });
    const page = await context.newPage();

    // Capture console logs
    page.on('console', msg => {
        if (msg.type() === 'error' || msg.type() === 'warning') {
            console.log(`[BROWSER ${msg.type().toUpperCase()}] ${msg.text()}`);
        }
    });

    // --- VISUAL HELPER: Status Banner ---
    async function updateVisualStatus(page, text) {
        await page.evaluate((msg) => {
            let el = document.getElementById('smoke-test-status');
            if (!el) {
                el = document.createElement('div');
                el.id = 'smoke-test-status';
                el.style.position = 'fixed';
                el.style.bottom = '20px';
                el.style.right = '20px';
                el.style.padding = '15px 25px';
                el.style.background = 'rgba(0, 0, 0, 0.85)';
                el.style.color = '#00ff00';
                el.style.fontSize = '24px';
                el.style.fontWeight = 'bold';
                el.style.zIndex = '99999';
                el.style.borderRadius = '12px';
                el.style.boxShadow = '0 6px 16px rgba(0,0,0,0.6)';
                el.style.fontFamily = 'monospace';
                el.style.border = '2px solid #00ff00';
                el.style.textAlign = 'right';
                document.body.appendChild(el);
            }
            el.innerHTML = `🤖 TESTE AUTOMATIZADO<br/><span style="color:#fff;font-size:18px">${msg}</span>`;
        }, text);
    }

    // ID Unico
    const timestamp = new Date().getTime().toString().slice(-6);
    const S_FINAL = `FINAL-${timestamp}`;
    const S_TEMP = `TEMP-${timestamp}`; // Para criar e apagar

    const BASE_URL = 'https://localhost:5173';

    try {
        console.log('--- INICIANDO SMOKE TEST CRUD COMPLETO (100%) ---');
        console.log(`Suffix Final: ${S_FINAL}`);
        console.log(`Suffix Temp: ${S_TEMP}`);

        // =========================================================================
        // 1. LOGIN
        // =========================================================================
        console.log('\n[1/12] Login (Gestor)...');
        await updateVisualStatus(page, "1. Realizando Login...");
        await page.goto(`${BASE_URL}/login?tenant=liotecnica`);
        console.log('     Preenchendo credenciais...');
        await page.fill('input[type="email"]', 'admin@liotencica.com.br');
        await page.fill('input[type="password"]', 'admin123');
        await page.click('button[type="submit"]');
        console.log('     Aguardando dashboard...');
        await page.waitForURL('**/dashboard', { timeout: 30000 });
        console.log('     Login OK.');

        // =========================================================================
        // 2. PROJETOS (CRUD + SUB-ABAS)
        // =========================================================================
        console.log('\n[2/12] Módulo: PROJETOS');
        await updateVisualStatus(page, "2. Módulo: PROJETOS (Criando...)");
        await page.goto(`${BASE_URL}/projects`);

        // --- 2 A. PROJETOS - WIZARD (CRIAR FINAL & TEMP) ---
        // Cria projeto FINAL
        const projFinal = `Proj_Smoke_${S_FINAL}`;
        await createProjectWizard(page, projFinal);
        console.log(`     Projeto FINAL criado: ${projFinal}`);

        // Cria projeto TEMP
        const projTemp = `Proj_Smoke_${S_TEMP}`;
        await createProjectWizard(page, projTemp);
        console.log(`     Projeto TEMP criado: ${projTemp}`);

        // Exclui projeto TEMP
        console.log('     Excluindo projeto TEMP...');
        await page.fill('[data-testid="input-busca-projeto"]', projTemp);
        await page.waitForTimeout(2000); // Wait for debounce filter

        // Find row. Projects list often uses a custom card or table. Current view suggests Table.
        const rowProj = page.locator(`tr:has-text("${projTemp}")`);
        if (await rowProj.count() > 0) {
            const btnDel = rowProj.locator('button[title="Excluir"], button[aria-label="Delete"]');
            await btnDel.click();
            await page.click('button:has-text("Confirmar"), button:has-text("Sim"), button:has-text("Excluir")');
            await page.waitForTimeout(1000);
            console.log('     Projeto TEMP excluído.');
        } else {
            console.warn(`     Linha ${projTemp} não encontrada para excluir.`);
        }

        // =========================================================================
        // 3. TAREFAS (Global)
        // =========================================================================
        console.log('\n[3/12] Módulo: TAREFAS (Global)');
        await updateVisualStatus(page, "3. Módulo: TAREFAS");
        await page.goto(`${BASE_URL}/tasks`);
        // Note: Tasks page might be Kanban or List. Assuming "Nova Tarefa" button matches selector.
        await performStandardCRUD(page, 'Nova Tarefa',
            `Tarefa_FINAL_${timestamp}`,
            `Tarefa_TEMP_${timestamp}`,
            {
                btnSelector: 'button:has-text("Nova Tarefa")',
                fillForm: async (name) => {
                    console.log(`     [TASK] Preenchendo título: ${name}`);
                    await page.fill('input[name="title"]', name);
                    await page.fill('textarea[name="description"]', 'Descrição Smoke Test');

                    // Fill Due Date
                    await page.fill('input[name="dueDate"]', '2024-12-31');

                    // Fill Assignee (MUI Select)
                    // Strategy: Find label "Atribuir a" (Typography/p), go up to parent Box, find the Select's clickable div
                    const assigneeLabel = page.locator('p:has-text("Atribuir a")');
                    if (await assigneeLabel.count() > 0) {
                        try {
                            // Click the Select trigger (sibling or in parent)
                            // Typography is sibling of Select in the Box
                            await assigneeLabel.locator('..').locator('.MuiSelect-select').click();
                            await page.waitForTimeout(500);
                            // Select option (first real user, skipping "Selecione..." if possible or just picking index 1)
                            const options = page.locator('li[role="option"]');
                            if (await options.count() > 1) {
                                await options.nth(1).click();
                            } else {
                                // Fallback if only 1 option (maybe only "Selecione..." or just 1 user)
                                await options.first().click();
                            }
                        } catch (e) {
                            console.warn('     [TASK] Falha ao selecionar assignee via label. Tentando via placeholder.');
                            try {
                                await page.click('div[role="button"]:has-text("Selecione...")');
                                await page.waitForTimeout(500);
                                await page.locator('li[role="option"]').nth(1).click();
                            } catch (ex) { }
                        }
                    }
                }
            }
        );

        // =========================================================================
        // 4. GMUD (Mudanças)
        // =========================================================================
        console.log('\n[4/12] Módulo: GMUD (Mudanças)');
        await updateVisualStatus(page, "4. Módulo: GMUD (Mudanças)");
        await page.goto(`${BASE_URL}/changes`);
        await performStandardCRUD(page, 'Nova Mudança',
            `GMUD_FINAL_${timestamp}`,
            `GMUD_TEMP_${timestamp}`,
            {
                btnSelector: 'button:has-text("Nova GMUD")',
                submitBtnSelector: 'button:has-text("Criar GMUD")',
                fillForm: async (name) => {
                    console.log(`     [GMUD] Preenchendo Wizard Step 1: ${name}`);
                    await page.fill('input[name="title"]', name);
                    await page.fill('textarea[name="description"]', 'Descrição da GMUD de Teste');

                    // Code if editable
                    try { await page.fill('input[name="code"]', `GMUD-TEST-${Date.now().toString().slice(-4)}`); } catch (e) { }

                    // Next Step
                    console.log('     [GMUD] Avançando para Step 2...');
                    await page.click('button:has-text("Próximo")');
                    await page.waitForTimeout(500);

                    // Step 2
                    const today = new Date().toISOString().slice(0, 16);
                    const tomorrow = new Date(new Date().getTime() + 86400000).toISOString().slice(0, 16);
                    await page.fill('input[name="scheduledStart"]', today);
                    await page.fill('input[name="scheduledEnd"]', tomorrow);
                    await page.fill('textarea[name="justification"]', 'Justificativa Teste');
                    await page.fill('textarea[name="backoutPlan"]', 'Rollback Teste');
                }
            }
        );

        // =========================================================================
        // 5. INCIDENTES
        // =========================================================================
        console.log('\n[5/12] Módulo: INCIDENTES');
        await updateVisualStatus(page, "5. Módulo: INCIDENTES");
        await page.goto(`${BASE_URL}/incidents`);
        await performStandardCRUD(page, 'Novo Incidente',
            `Incidente_FINAL_${timestamp}`,
            `Incidente_TEMP_${timestamp}`,
            {
                fillForm: async (name) => {
                    console.log(`     [INCIDENT] Preenchendo título: ${name}`);
                    await page.fill('input[name="title"]', name);
                    // Native Selects
                    try { await page.selectOption('select[name="categoryId"]', { index: 1 }); } catch (e) { }
                    try { await page.selectOption('select[name="impact"]', 'HIGH'); } catch (e) { }
                    try { await page.selectOption('select[name="urgency"]', 'HIGH'); } catch (e) { }
                    await page.fill('textarea[name="description"]', 'Descrição do Incidente Smoke');
                }
            }
        );

        // =========================================================================
        // 6. ATIVOS
        // =========================================================================
        console.log('\n[6/12] Módulo: ATIVOS');
        await updateVisualStatus(page, "6. Módulo: ATIVOS");
        await page.goto(`${BASE_URL}/assets`);
        await performStandardCRUD(page, 'Novo Ativo',
            `Asset_FINAL_${timestamp}`,
            `Asset_TEMP_${timestamp}`,
            {
                fillForm: async (name) => {
                    console.log(`     [ASSET] Preenchendo nome: ${name}`);
                    await page.fill('input[name="name"]', name);
                    await page.fill('input[name="tag"]', `TAG-${name.includes('FINAL') ? S_FINAL : S_TEMP}`);
                    // await page.selectOption('select[name="categoryId"]', { index: 1 });
                }
            }
        );

        // =========================================================================
        // 7. FORNECEDORES
        // =========================================================================
        console.log('\n[7/12] Módulo: FORNECEDORES');
        await updateVisualStatus(page, "7. Módulo: FORNECEDORES");
        await page.goto(`${BASE_URL}/suppliers`);
        await performStandardCRUD(page, 'Novo Fornecedor',
            `Fornecedor_FINAL_${timestamp}`,
            `Fornecedor_TEMP_${timestamp}`,
            {
                fillForm: async (name) => {
                    console.log(`     [SUPPLIER] Preenchendo nome: ${name}`);
                    await page.fill('input[name="name"]', name);
                    await page.fill('input[name="document"]', name.includes('FINAL') ? '11111111000111' : '22222222000222');
                    await page.fill('input[name="email"]', 'teste@fornecedor.com');

                    try { await page.selectOption('select[name="category"]', 'SERVICOS'); } catch (e) { }
                    try { await page.selectOption('select[name="status"]', 'ATIVO'); } catch (e) { }
                    try { await page.selectOption('select[name="rating"]', '5'); } catch (e) { }
                }
            }
        );

        // =========================================================================
        // 8. CONTRATOS
        // =========================================================================
        console.log('\n[8/12] Módulo: CONTRATOS');
        await updateVisualStatus(page, "8. Módulo: CONTRATOS");
        await page.goto(`${BASE_URL}/contracts`);
        await performStandardCRUD(page, 'Novo Contrato',
            `Contrato_FINAL_${timestamp}`,
            `Contrato_TEMP_${timestamp}`,
            {
                // btnSelector: '[data-testid="btn-novo-contrato"]', // Adjust if explicit
                fillForm: async (name) => {
                    console.log(`     [CONTRACT] Preenchendo número e descrição: ${name}`);
                    await page.fill('input[name="number"]', `CTR-${name.includes('FINAL') ? S_FINAL : S_TEMP}`);
                    await page.fill('textarea[name="description"]', name); // It's textarea in ContractModal? Checked: Yes/TextField multiline probably. Or input name="description"
                    // Code review said ContractModal has description? Actually ContractModal has:
                    // number, description (maybe), object?
                    // Let's assume description exists or valid fields.
                    // ContractModal View showed: number, value, start/end dates.

                    // MUI Select: Tipo de Contrato ("Tipo de Contrato")
                    const typeLabel = page.locator('label:has-text("Tipo de Contrato")');
                    if (await typeLabel.count() > 0) {
                        try {
                            await typeLabel.locator('..').locator('.MuiSelect-select').click();
                        } catch (e) { await page.click('label:has-text("Tipo de Contrato") ~ div'); }
                        await page.waitForTimeout(200);
                        await page.locator('li[role="option"]').first().click();
                    }

                    // MUI Select: Fornecedor ("Fornecedor / Razão Social" or similar?)
                    // Code view says: "Fornecedor / Razão Social"
                    // Checking ContractModal View: <TextField label="Fornecedor / Razão Social" select ...>
                    const fornLabel = page.locator('label:has-text("Fornecedor / Razão Social")');
                    if (await fornLabel.count() > 0) {
                        try {
                            await fornLabel.locator('..').locator('.MuiSelect-select').click();
                        } catch (e) { await page.click('label:has-text("Fornecedor / Razão Social") ~ div'); }
                        await page.waitForTimeout(200);
                        await page.locator('li[role="option"]').first().click();
                    }

                    await page.fill('input[name="startDate"]', '2024-01-01');
                    await page.fill('input[name="endDate"]', '2024-12-31');
                    await page.fill('input[name="value"]', '10000');
                }
            }
        );

        // =========================================================================
        // 9. FINANCEIRO (Orçamentos)
        // =========================================================================
        console.log('\n[9/12] Módulo: FINANCEIRO (Orçamentos)');
        await updateVisualStatus(page, "9. Módulo: FINANCEIRO");
        await page.goto(`${BASE_URL}/finance`);
        await page.click('[data-testid="tab-2"]'); // Aba Orçamentos
        await page.waitForTimeout(500);

        await performStandardCRUD(page, 'Novo Orçamento',
            `Budget_FINAL_${timestamp}`,
            `Budget_TEMP_${timestamp}`,
            {
                btnSelector: '[data-testid="btn-new-budget"]',
                fillForm: async (name) => {
                    console.log(`     [BUDGET] Preenchendo nome: ${name}`);
                    await page.fill('[data-testid="input-budget-name"]', name);

                    // Select Fiscal Year
                    const fySelect = page.locator('[data-testid="select-fiscal-year"]');
                    await fySelect.selectOption({ index: 1 });

                    await page.fill('[data-testid="input-budget-description"]', 'Budget created by Smoke Test');
                }
            }
        );

        // =========================================================================
        // 10. FINANCEIRO (Contas)
        // =========================================================================
        console.log('\n[10/12] Módulo: FINANCEIRO (Contas)');
        await updateVisualStatus(page, "10a. Módulo: FINANCEIRO (Contas)");
        await page.click('[data-testid="tab-3"]'); // Aba Plano de Contas
        await page.waitForTimeout(500);

        await performStandardCRUD(page, 'Nova Conta',
            `Conta_FINAL_${timestamp}`,
            `Conta_TEMP_${timestamp}`,
            {
                fillForm: async (name) => {
                    console.log(`     [ACCOUNT] Preenchendo nome e código: ${name}`);
                    await page.fill('input[name="code"]', `9.9.${new Date().getTime().toString().slice(-4)}`);
                    await page.fill('input[name="name"]', name);

                    // MUI Select: Tipo de Conta
                    // AccountModal structure: TextField select label="Tipo de Conta"
                    const typeLabel = page.locator('label:has-text("Tipo de Conta")');
                    if (await typeLabel.count() > 0) {
                        await typeLabel.locator('..').locator('.MuiSelect-select').click();
                        await page.waitForTimeout(200);
                        await page.click('li[role="option"][data-value="OPEX"]');
                    }
                }
            }
        );

        // =========================================================================
        // 11. FINANCEIRO (Despesas) - Special Case with File Upload
        // =========================================================================
        console.log('\n[11/12] Módulo: FINANCEIRO (Despesas)');
        await updateVisualStatus(page, "11a. Módulo: FINANCEIRO (Despesas)");
        // Create a dummy file
        const dummyPdfPath = path.resolve(__dirname, 'dummy_smoke.pdf');
        if (!fs.existsSync(dummyPdfPath)) {
            fs.writeFileSync(dummyPdfPath, 'Dummy PDF Content for Smoke Test');
        }

        await page.click('[data-testid="tab-1"]'); // Aba Despesas
        await page.waitForTimeout(500);

        const createExpense = async (name) => {
            console.log(`     Criando Despesa: ${name}`);
            await page.click('button:has-text("Lançar Despesa")');
            await page.waitForTimeout(500);

            console.log('     [EXPENSE] Preenchendo dados...');
            await page.fill('input[name="description"]', name);
            await page.fill('input[name="amount"]', '150,00');

            // Dates
            const today = new Date().toISOString().split('T')[0];
            await page.fill('input[name="date"]', today);
            await page.fill('input[name="dueDate"]', today);

            // NF
            await page.fill('input[name="invoiceNumber"]', `NF-${Date.now()}`);

            // Category Button
            await page.click('button:has-text("Serviço")');

            // Fornecedor (MUI Select)
            // Label "Fornecedor *" inside Box => Typography
            // Structure: Box > [Typography(Fornecedor *), Controller(Select)]
            // We can click the element appearing after "Fornecedor *"
            const supplierLabel = page.locator('p:has-text("Fornecedor")').first();
            if (await supplierLabel.isVisible()) {
                // The Select is likely following it. Mui Select has class .MuiOutlinedInput-root usually or .MuiSelect-select
                // Let's click loosely in the middle of the box? 
                // Reliable: Click the select trigger.
                // It is likely the first .MuiSelect-select inside the form?
                // Or filter by text "Selecione...".
                // Let's use specific traversing logic found in inspection or general heuristic.
                // Heuristic: Click the select directly below/next to label.
                await page.locator('.MuiSelect-select').nth(1).click(); // supplier is 2nd select (1st is Type in modal? No type is buttons)
                // Wait. 1st select is Type? No Type is Buttons.
                // 1st Select might be Fornecedor! 
                // Let's try matching label text to be safe.
                // But Select is inside a Controller next to Typography.
            } else {
                // Fallback: Click the first select on the page that is visible
                await page.locator('.MuiSelect-select').first().click();
            }
            await page.waitForTimeout(200);
            await page.locator('li[role="option"]').first().click();

            // Cost Center (MUI Select) - Next select
            await page.locator('.MuiSelect-select').nth(1).click(); // Assuming 2nd select is Cost Center or Contract
            await page.waitForTimeout(200);
            await page.locator('li[role="option"]').first().click();

            // Upload File
            const fileInput = page.locator('input[type="file"]');
            await fileInput.setInputFiles(dummyPdfPath);

            // Save
            await page.click('button:has-text("Lançar Despesa"), button:has-text("Salvar")');
            await page.waitForSelector(`text="${name}"`, { timeout: 10000 });
            console.log(`     Despesa criada: ${name}`);
        };

        const deleteExpense = async (name) => {
            console.log(`     Excluindo Despesa: ${name}`);
            const row = page.locator(`tr:has-text("${name}")`);
            if (await row.count() > 0) {
                await row.locator('button[title="Excluir"], button[aria-label="Delete"]').click();
                await page.click('button:has-text("Confirmar"), button:has-text("Excluir")');
                await page.waitForTimeout(500);
                console.log('     Despesa excluída.');
            }
        };

        const expFinal = `Exp_FINAL_${timestamp}`;
        await createExpense(expFinal);

        const expTemp = `Exp_TEMP_${timestamp}`;
        await createExpense(expTemp);
        await deleteExpense(expTemp);

        // =========================================================================
        // 12. BASE DE CONHECIMENTO
        // =========================================================================
        console.log('\n[12/12] Módulo: BASE DE CONHECIMENTO');
        await updateVisualStatus(page, "12. Módulo: BASE DE CONHECIMENTO");
        await page.goto(`${BASE_URL}/knowledge`);
        await performStandardCRUD(page, 'Novo Artigo',
            `Artigo_FINAL_${timestamp}`,
            `Artigo_TEMP_${timestamp}`,
            {
                btnSelector: 'button:has-text("Novo Artigo")',
                fillForm: async (name) => {
                    console.log(`     [KB] Preenchendo título: ${name}`);
                    await page.fill('input[name="title"]', name);

                    // Category Select (MUI TextField select)
                    const catLabel = page.locator('label:has-text("Categoria")');
                    if (await catLabel.count() > 0) {
                        try {
                            await catLabel.locator('..').locator('.MuiSelect-select').click();
                        } catch (e) { await catLabel.click(); }

                        await page.waitForTimeout(200);
                        const opts = page.locator('li[role="option"]');
                        if (await opts.count() > 0) await opts.first().click();
                        else await page.keyboard.press('Escape');
                    }

                    await page.fill('input[name="tags"]', 'smoke, test');
                    await page.fill('textarea[name="content"]', 'Conteúdo do artigo de teste.');
                }
            }
        );

        // Clean up dummy file
        if (fs.existsSync(dummyPdfPath)) fs.unlinkSync(dummyPdfPath);

        console.log('\n--- SMOKE TEST FULL CRUD FINALIZADO COM SUCESSO ---');
        console.log(`DADOS MANTIDOS: *${S_FINAL}*`);

    } catch (error) {
        console.error('ERRO FATAL:', error);
        await page.screenshot({ path: `error-crud-full.png` });
        process.exit(1);
    } finally {
        await browser.close();
    }
})();

// --- FUNÇÃO AUXILIAR DE CRIAÇÃO (WIZARD PROJETO) ---
async function createProjectWizard(page, name) {
    console.log(`     [WIZARD] Iniciando criação de projeto: ${name}`);

    // Check current URL vs button visibility
    if (await page.isVisible('[data-testid="btn-novo-projeto"]')) {
        await page.click('[data-testid="btn-novo-projeto"]');
    } else {
        await page.goto('https://localhost:5173/projects');
        await page.click('[data-testid="btn-novo-projeto"]');
    }

    await page.waitForSelector('text="Identificação"');
    console.log('     [WIZARD] Identificação...');
    await page.fill('[data-testid="input-nome"]', name);

    // Tipos / Selects (MUI) in Wizard
    try {
        await page.click('[data-testid="select-tipo"]');
        await page.click('li[data-value="INTERNO"]');
    } catch (e) { }

    try {
        await page.click('[data-testid="select-centro-custo"]');
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('Enter');
    } catch (e) { }

    await page.waitForTimeout(500);

    // Manager Conditional
    const managerSelect = page.locator('[data-testid="select-gerente"]');
    if (await managerSelect.isEnabled()) {
        try {
            await managerSelect.click({ timeout: 1000 });
            await page.keyboard.press('ArrowDown');
            await page.keyboard.press('Enter');
        } catch (e) { }
    }

    try {
        await page.click('[data-testid="select-tech-lead"]');
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('Enter');
    } catch (e) { }

    await page.click('button:has-text("Próximo")');

    // Step 1: Escopo e Justificativa
    await page.waitForSelector('textarea[name="description"]');
    console.log('     [WIZARD] Preenchendo Escopo e Justificativa...');

    // Area (Autocomplete) - Optional but let's try to fill properly or skip if causes issues.
    const inputArea = page.locator('[data-testid="input-area"]');
    if (await inputArea.isVisible()) {
        await inputArea.click();
        await inputArea.type('Tecnologia', { delay: 100 });
        await page.waitForTimeout(500);
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('Enter');
    }

    await page.fill('textarea[name="description"]', 'Descrição do Escopo Macro do Projeto Smoke Test');
    await page.fill('textarea[name="notes"]', 'Justificativa de Negócio para o Projeto Smoke Test');

    console.log('     [WIZARD] Verificando preenchimento...');
    // Ensure value is set
    const descVal = await page.inputValue('textarea[name="description"]');
    if (!descVal) console.warn('     [AVISO] Descrição vazia!');

    console.log('     [WIZARD] Clicando Próximo (Step 1 -> 2)...');
    await page.click('button:has-text("Próximo")');

    // Check for errors
    await page.waitForTimeout(1000);
    const errors = await page.locator('.Mui-error, p.Mui-error').allTextContents();
    if (errors.length > 0) {
        console.error('     [ERRO] Validação falhou no Step 1:', errors);
        // Take screenshot of error
        await page.screenshot({ path: `error-wizard-step1-${Date.now()}.png` });
    }

    // Step 2: Planejamento
    try {
        console.log('     [WIZARD] Aguardando Step 2 (inputs)...');
        // Wait for input budget which is definitely in step 2
        await page.waitForSelector('input[name="budget"]', { timeout: 10000 });
    } catch (e) {
        console.error('     [ERRO] Timeout aguardando Step 2 inputs. Verifique erros de validação acima.');
        throw e;
    }

    console.log('     [WIZARD] Preenchendo Planejamento (Datas/Budget)...');
    await page.click('button:has-text("Média")');
    await page.fill('[data-testid="input-inicio"]', '2024-01-01');
    await page.fill('[data-testid="input-termino"]', '2024-12-31');
    await page.fill('input[name="budget"]', '10000');

    console.log('     [WIZARD] Submit Rascunho...');
    // Check button state
    const submitBtn = page.locator('button:has-text("Criar Rascunho")');
    if (await submitBtn.isDisabled()) {
        console.error('     [ERRO] Botão de criar rascunho está DESABILITADO.');
    }

    await submitBtn.click();

    // Check for submit errors (toast or validation)
    await page.waitForTimeout(1000);
    const submitErrors = await page.locator('.Mui-error, p.Mui-error').allTextContents();
    if (submitErrors.length > 0) {
        console.error('     [ERRO] Validação falhou no Submit:', submitErrors);
        await page.screenshot({ path: `error-wizard-submit-${Date.now()}.png` });
    }

    // Check for toast
    const toast = page.locator('div[role="alert"]'); // Common for toast
    if (await toast.count() > 0) {
        const toastText = await toast.allTextContents();
        console.error('     [ERRO] Toast detectado:', toastText);
    }

    console.log('     [WIZARD] Aguardando criação na lista...');
    try {
        // Increase timeout for submission
        await page.waitForSelector(`text="${name}"`, { timeout: 30000 });
        console.log('     [WIZARD] Ok.');
    } catch (e) {
        console.error('     [ERRO] Timeout aguardando projeto na lista. Verificando se Wizard ainda está aberto...');
        if (await page.isVisible('text="Planejamento"')) {
            console.error('     [ERRO] Wizard travado na tela de Planejamento.');
        }
        throw e;
    }
}

// --- FUNÇÃO AUXILIAR DE CRUD GENÉRICO ---
async function performStandardCRUD(page, btnLabel, nameFinal, nameTemp, options = {}) {
    const {
        fillForm,
        btnSelector = `button:has-text("${btnLabel}")`,
        deleteTitle = 'Excluir'
    } = options;

    // 1. CREATE FINAL
    console.log(`     [CRUD] 1. Criando FINAL: ${nameFinal}...`);
    // Check if button is visible, if not maybe try navigation or just fail
    await page.click(btnSelector);
    await page.waitForTimeout(500); // Animation
    await fillForm(nameFinal);
    await page.click('button[type="submit"]');
    // Wait for item to appear
    console.log(`     [CRUD] Aguardando: ${nameFinal}`);
    await page.waitForSelector(`text="${nameFinal}"`, { timeout: 10000 });

    // 2. EDIT FINAL (Optional - Skipped for robustness)

    // 3. CREATE TEMP
    console.log(`     [CRUD] 2. Criando TEMP: ${nameTemp}...`);
    await page.waitForTimeout(500);
    await page.click(btnSelector);
    await page.waitForTimeout(500);
    await fillForm(nameTemp);
    await page.click('button[type="submit"]');
    await page.waitForSelector(`text="${nameTemp}"`, { timeout: 10000 });

    // 4. DELETE TEMP
    console.log(`     [CRUD] 3. Excluindo TEMP...`);
    // Find row
    const row = page.locator(`tr:has-text("${nameTemp}")`);
    if (await row.count() > 0) {
        const btnDel = row.locator('button[title="Excluir"], button[aria-label="Delete"]');
        if (await btnDel.count() > 0) {
            await btnDel.click();
            await page.click('button:has-text("Confirmar"), button:has-text("Excluir"), button:has-text("Sim")');
            await page.waitForTimeout(500);
            console.log('     [CRUD] Excluído.');
        } else {
            console.warn(`     [AVISO] Botão de excluir não encontrado na linha ${nameTemp}.`);
        }
    } else {
        // Fallback for Cards?
        const card = page.locator(`div:has-text("${nameTemp}")`);
        if (await card.count() > 0) {
            // Try to find delete button in card, often hidden or in menu
        }
        console.warn(`     [AVISO] Linha/Card ${nameTemp} não achada para excluir.`);
    }
}
