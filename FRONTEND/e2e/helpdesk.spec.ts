import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth.helper';

test.describe('Help Desk: Suíte E2E 100% Funcional', () => {

    test('1. Admin: Operações de CRUD no Catálogo de Serviços', async ({ page }) => {
        await loginAs(page, 'admin');
        await page.goto('/config/organization?tab=servicedesk&sd=catalog');
        
        await expect(page.getByText('Administração do Catálogo ITBM')).toBeVisible();
        
        // Cria Nova Categoria
        const btnNovaCat = page.getByRole('button', { name: /nova/i }).first();
        await btnNovaCat.waitFor({ state: 'visible' });
        await btnNovaCat.click();
        
        await page.getByRole('textbox', { name: /nome/i }).fill('Sistemas ERP - Teste E2E');
        await page.getByRole('button', { name: /salvar/i }).click();

        // Aguarda a Categoria aparecer na Tabela
        await expect(page.getByText('Sistemas ERP - Teste E2E')).toBeVisible();
        
        // Tira print
        await expect(page).toHaveScreenshot('e2e-catalog-admin.png', { fullPage: true });
    });

    test('2. Portal: Deflexão da Base e Abertura de Ticket (Requester)', async ({ page }) => {
        await loginAs(page, 'admin');
        await page.goto('/portal');
        
        await expect(page.getByText('Central de Atendimento')).toBeVisible();
        
        // Clica em um Serviço Aleatório ou no Primeiro do Catálogo
        const btnSolicitar = page.getByRole('button', { name: /solicitar/i }).first();
        await btnSolicitar.waitFor({ state: 'visible' });
        await btnSolicitar.click();
        
        // Aguarda Modal
        await expect(page.getByText('Solicitação:')).toBeVisible();
        
        // Testa a Deflexão Preenchendo um Título Conhecido
        await page.locator('input[type="text"]').first().fill('Erro na Impressora');
        // Simulação de espera de 1 segundo pro debounce do useEffect bater na knowledge.service.js
        await page.waitForTimeout(1000);
        
        // Preenche Relato
        await page.locator('textarea').first().fill('A impressora parou de puxar as folhas. Urgente.');
        
        // Envia o chamado (Upload Mock bypass)
        await page.getByRole('button', { name: /enviar solicitação|salvar/i }).click();
        
        // Valida que o modal fugiu e o Ticket apareceu
        await expect(page.getByText('Erro na Impressora')).toBeVisible();
        await expect(page).toHaveScreenshot('e2e-portal-created.png', { fullPage: true });
    });

    test('3. Agente: Service Desk, Interação Bate-Papo e KPIs', async ({ page }) => {
        await loginAs(page, 'admin');
        await page.goto('/servicedesk');
        
        // Valida Dashboards
        await expect(page.getByText('Central de Serviços (Service Desk)')).toBeVisible();
        await expect(page.getByText('Fila de Triagem (Abertos)')).toBeVisible();
        await expect(page.getByText('SLA Estourado')).toBeVisible();
        
        // Clica no recém-criado Ticket
        const ticketRow = page.getByText('Erro na Impressora').first();
        await ticketRow.waitFor({ state: 'visible' });
        
        // Como o ROW é enorme, vamos localizar o clique
        await ticketRow.click();
        
        // Valida Bate Papo e envio de mensagens
        await expect(page.getByText('Atendimento do Chamado')).toBeVisible();
        await page.locator('textarea').last().fill('E2E: Ticket recebido pelo Agente. Solucionando.');
        await page.getByRole('button', { name: /enviar/i }).click();
        
        // Valida Mudança de Status -> Resolved
        await page.getByRole('button', { name: /encerrar|resolver/i }).first().click();
        
        await expect(page).toHaveScreenshot('e2e-agent-resolved.png', { fullPage: true });
    });

});
