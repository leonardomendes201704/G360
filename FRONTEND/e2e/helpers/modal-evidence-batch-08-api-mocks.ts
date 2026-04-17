import type { Page, Route } from '@playwright/test';

const FAKE_ACCESS =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
    Buffer.from(JSON.stringify({ sub: 'e2e', exp: 9999999999, tenantSlug: 'master' })).toString('base64url') +
    '.e2e-sig';

function pathnameFromUrl(url: string): string {
    try {
        return new URL(url).pathname;
    } catch {
        return url;
    }
}

/** Projeto usado nos lotes 05–07 (FollowUp, Member, Minute, Propostas, Tarefas). */
export const E2E_PROJECT_ID = 'e2e-proj-modal-5';

/** Incidente listado em `/incidents` (IncidentModal / IncidentViewModal). */
export const E2E_INCIDENT_ID = 'e2e-inc-list-1';

const mockExpensePendingApproval = {
    id: 'e2e-exp-appr-1',
    description: 'Despesa aguardando aprovação E2E',
    status: 'AGUARDANDO_APROVACAO',
    amount: 1500,
    date: '2026-04-10T12:00:00.000Z',
    dueDate: '2026-04-25T00:00:00.000Z',
    supplier: { name: 'Fornecedor Mock' },
    costCenter: { code: 'CC-E2E' },
    account: { name: 'Despesas Gerais' },
    invoiceNumber: null,
    fileUrl: null,
};

const refUsers = [
    { id: 'e2e-ref-user-1', name: 'Utilizador E2E', email: 'e2e-ref@g360.com.br' },
    { id: 'e2e-ref-user-2', name: 'Outro Utilizador', email: 'e2e-ref-2@g360.com.br' },
];

const refSuppliers = [{ id: 'sup-1', name: 'Fornecedor Mock' }];
const refAccounts = [{ id: 'e2e-acc-1', code: '1.01.001', name: 'Despesas Gerais', type: 'OPEX' }];
const refCostCenters = [{ id: 'e2e-cc-1', code: 'CC-E2E', name: 'Centro E2E' }];

const mockProjectE2E = {
    id: E2E_PROJECT_ID,
    name: 'Projeto E2E Modal',
    code: 'PRJ-E2E',
    description: 'Projeto para evidência Playwright',
    managerId: 'e2e-mgr',
    approvalStatus: 'APPROVED',
    status: 'ACTIVE',
    budget: 100000,
    spent: 0,
    startDate: '2026-01-01T00:00:00.000Z',
    endDate: '2026-12-31T00:00:00.000Z',
    members: [
        {
            id: 'e2e-memb-1',
            userId: 'e2e-ref-user-1',
            user: { id: 'e2e-ref-user-1', name: 'Utilizador E2E', email: 'e2e-ref@g360.com.br' },
            role: 'DEVELOPER',
            calculatedStatus: 'ativo',
        },
    ],
    tasks: [],
    risks: [],
    teams: [],
};

/** Proposta vencedora sem condição comercial — abre `PaymentConditionModal` («Definir Condição»). */
const mockProposalWinner = {
    id: 'e2e-prop-1',
    supplierId: 'sup-1',
    value: 50000,
    isWinner: true,
    status: 'APROVADA',
    paymentCondition: null,
    fileUrl: null,
};

/** Follow-up não concluído — botão «Reagendar» abre `RescheduleModal`. */
const mockFollowUpForReschedule = {
    id: 'e2e-fu-resched-1',
    title: 'Follow-up E2E reagendar',
    type: 'MEETING',
    priority: 'MEDIUM',
    dueDate: '2026-12-15T14:00:00.000Z',
    status: 'SCHEDULED',
    completedAt: null,
    assignee: { id: 'e2e-ref-user-1', name: 'Utilizador E2E' },
    author: { id: 'e2e-mgr', name: 'Gestor E2E' },
};

/** Risco listado na tabela — ícone «visualizar» abre `RiskViewModal`. */
const mockProjectRiskForView = {
    id: 'e2e-risk-view-1',
    description: 'Risco E2E para visualização no dossiê.',
    category: 'technical',
    impact: 'MEDIO',
    probability: 'MEDIA',
    status: 'OPEN',
    strategy: 'Mitigação em testes automatizados.',
};

/** Detalhe para `GET /incidents/:id` (IncidentModal / IncidentViewModal). */
const mockIncidentFull = {
    id: E2E_INCIDENT_ID,
    code: 'INC-E2E-001',
    title: 'Incidente mock E2E',
    description: 'Descrição de teste para evidência Playwright.',
    status: 'OPEN',
    priority: 'P3',
    impact: 'MEDIO',
    urgency: 'MEDIA',
    categoryId: 'e2e-cat-1',
    assigneeId: '',
    relatedChangeId: '',
    relatedAssetId: '',
    comments: [],
    attachments: [],
    createdAt: '2026-04-01T10:00:00.000Z',
    updatedAt: '2026-04-01T10:00:00.000Z',
    slaBreached: false,
};

/** Alinhado a `ManagerOverview` — `kpis.tasks` tem de ser escalar (StatsCard), não objeto. */
const managerDashboardStats = {
    kpis: {
        finance: { budget: 50000, spent: 12000 },
        tasks: 13,
        overdueTeamTasks: 0,
        projects: 5,
        gmuds: 0,
        contracts: 2,
    },
    teamHealth: [],
    pendingApprovals: [],
    expiringContracts: [],
};

const managerAnalytics = {
    taskDistribution: { TODO: 2, IN_PROGRESS: 1, DONE: 10, CANCELLED: 0 },
    riskDistribution: { low: 1, medium: 0, high: 0, critical: 0 },
    projectDistribution: { ACTIVE: 2, COMPLETED: 1 },
    incidentTrend: [{ date: '2026-04-01', created: 1, resolved: 1 }],
    expenseTrend: [{ month: '2026-04', amount: 500 }],
};

/** `IncidentsPage` usa open/inProgress/resolved/…; `ManagerOverview` usa open/slaBreached/trendOpen. */
const incidentKpis = {
    open: 1,
    inProgress: 0,
    resolved: 0,
    resolvedToday: 0,
    slaBreached: 0,
    trendOpen: 0,
    resolvedWeek: 0,
};

/**
 * API mock para `modal-evidence-batch-08.spec.ts` — proposta, reagendar follow-up, riscos, perfil (modais 36–40).
 * Baseado no lote 07 + `GET` risks, follow-up com item para reagendar, `POST` reschedule/risks.
 */
export async function installModalEvidenceBatch08ApiMocks(page: Page): Promise<void> {
    await page.route('**/api/v1/**', async (route: Route) => {
        const req = route.request();
        const url = req.url();
        const method = req.method();
        const path = pathnameFromUrl(url);

        if (method === 'POST' && path.includes('/auth/refresh')) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ token: FAKE_ACCESS }),
            });
            return;
        }

        if (method === 'POST' && url.includes('/auth/login')) {
            let email = '';
            try {
                const post = req.postDataJSON() as { email?: string } | null;
                email = post?.email || '';
            } catch {
                /* ignore */
            }
            const isGlobalSuperAdmin = email === 'admin@g360.com.br';
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    token: FAKE_ACCESS,
                    refreshToken: 'e2e-refresh',
                    user: isGlobalSuperAdmin
                        ? {
                              id: 'e2e-sa',
                              email: 'admin@g360.com.br',
                              name: 'Admin E2E',
                              roles: [{ name: 'Super Admin' }],
                              schema: 'public',
                          }
                        : {
                              id: 'e2e-mgr',
                              email: 'gestor.ti@g360.com.br',
                              name: 'Gestor E2E',
                              roles: [{ name: 'Manager', permissions: [{ module: 'ALL', action: 'ALL' }] }],
                              schema: 'public',
                          },
                    enabledModules: [],
                }),
            });
            return;
        }

        if (method === 'GET' && path.includes('/tenants/dashboard-stats')) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    data: { total: 0, active: 0, inactive: 0, pool: { activeClients: 0 } },
                }),
            });
            return;
        }

        if (method === 'GET' && path.includes('/global-settings/system-health')) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ data: { status: 'healthy', memory: { heapPercent: '10' } } }),
            });
            return;
        }

        if (method === 'POST' && path.endsWith('/auth/stream-token')) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ streamToken: 'e2e-stream-token' }),
            });
            return;
        }

        if (method === 'GET' && path.includes('/notifications/stream')) {
            await route.fulfill({
                status: 200,
                headers: { 'Content-Type': 'text/event-stream; charset=utf-8' },
                body: 'data: {"type":"connected"}\n\n',
            });
            return;
        }

        if (method === 'GET' && /\/notifications\/?$/.test(path)) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    notifications: [
                        {
                            id: 'e2e-notif-1',
                            title: 'Notificação E2E',
                            message: 'Mensagem de teste para o dossiê.',
                            type: 'INFO',
                            isRead: false,
                            createdAt: new Date().toISOString(),
                            link: null,
                        },
                    ],
                    unreadCount: 1,
                }),
            });
            return;
        }

        if (method === 'PUT' && /\/notifications\/[^/]+\/read\/?$/.test(path)) {
            await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
            return;
        }

        if (method === 'PUT' && path.endsWith('/notifications/read-all')) {
            await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
            return;
        }

        if (method === 'GET' && path.includes('/tasks/time/active')) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(null),
            });
            return;
        }

        if (method === 'GET' && path.includes('/dashboard/manager')) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(managerDashboardStats),
            });
            return;
        }

        if (method === 'GET' && path.includes('/dashboard/analytics')) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(managerAnalytics),
            });
            return;
        }

        if (method === 'GET' && path.includes('/incidents/kpis')) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(incidentKpis),
            });
            return;
        }

        if (method === 'GET' && path.includes('/incidents/categories')) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([{ id: 'e2e-cat-1', name: 'Categoria E2E', color: '#2563eb' }]),
            });
            return;
        }

        if (
            method === 'GET' &&
            path.match(/\/incidents\/[^/]+$/) &&
            !path.endsWith('/kpis') &&
            !path.endsWith('/categories')
        ) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(mockIncidentFull),
            });
            return;
        }

        if (method === 'POST' && path.endsWith('/incidents')) {
            await route.fulfill({
                status: 201,
                contentType: 'application/json',
                body: JSON.stringify({
                    id: 'e2e-inc-1',
                    title: 'Incidente E2E',
                    description: 'mock',
                    priority: 'MEDIUM',
                    impactLevel: 'MEDIUM',
                }),
            });
            return;
        }

        if (method === 'GET' && path.includes('/audit-logs')) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ data: [] }),
            });
            return;
        }

        if (method === 'GET' && path.includes('/corporate-risks/metrics/heatmap')) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([]),
            });
            return;
        }

        if (method === 'GET' && path.includes('/corporate-risks')) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([]),
            });
            return;
        }

        if (method === 'POST' && path.endsWith('/corporate-risks')) {
            await route.fulfill({
                status: 201,
                contentType: 'application/json',
                body: JSON.stringify({ id: 'e2e-risk-new', title: 'Risco E2E' }),
            });
            return;
        }

        if (method === 'GET' && path.endsWith('/knowledge-base/dashboard')) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    totalArticles: 1,
                    totalViews: 5,
                    categories: [{ name: 'Cat E2E', value: 1 }],
                    growth: 0,
                }),
            });
            return;
        }

        if (method === 'GET' && path.match(/\/knowledge-base\/(?!dashboard$)[^/]+$/)) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    id: 'e2e-kb-1',
                    title: 'Artigo E2E',
                    content: '<p>Conteúdo</p>',
                    categoryId: 'e2e-kcat-1',
                    attachments: [],
                }),
            });
            return;
        }

        if (method === 'GET' && /\/knowledge-base\/?$/.test(path)) {
            await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
            return;
        }

        if (method === 'GET' && path.includes('/knowledge-categories')) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([{ id: 'e2e-kcat-1', name: 'Cat E2E', color: '#2563eb' }]),
            });
            return;
        }

        if (method === 'PUT' && /\/integrations\/LDAP\/?$/.test(path)) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ type: 'LDAP', isEnabled: true, config: {} }),
            });
            return;
        }

        if (method === 'POST' && path.includes('/integrations/LDAP/test')) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ message: 'Conexão OK (mock)' }),
            });
            return;
        }

        if (method === 'GET' && path.includes('/finance-dashboard/overview')) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    totalBudget: 0,
                    totalSpent: 0,
                    available: 0,
                    consumption: 0,
                }),
            });
            return;
        }

        if (method === 'GET' && path.includes('/finance-dashboard/evolution')) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ labels: [], planned: [], actual: [] }),
            });
            return;
        }

        if (method === 'GET' && path.includes('/finance-dashboard/insights')) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ alerts: [], savings: [] }),
            });
            return;
        }

        if (method === 'GET' && path.includes('/finance-dashboard/cost-centers')) {
            await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
            return;
        }

        if (method === 'GET' && path.endsWith('/fiscal-years')) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([{ id: 'e2e-fy-1', year: 2026, label: '2026', isClosed: false }]),
            });
            return;
        }

        if (method === 'GET' && path.includes('/reference/accounts')) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(refAccounts),
            });
            return;
        }

        if (method === 'GET' && path.includes('/reference/cost-centers')) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(refCostCenters),
            });
            return;
        }

        if (method === 'GET' && path.includes('/reference/my-cost-centers')) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ costCenters: refCostCenters, isAdmin: true }),
            });
            return;
        }

        if (method === 'GET' && path.includes('/reference/suppliers')) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(refSuppliers),
            });
            return;
        }

        if (method === 'GET' && path.includes('/reference/users')) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(refUsers),
            });
            return;
        }

        if (method === 'GET' && path.includes('/reference/contracts')) {
            await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
            return;
        }

        if (method === 'GET' && /\/suppliers\/?$/.test(path)) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(refSuppliers),
            });
            return;
        }

        if (method === 'GET' && /\/expenses\/?$/.test(path)) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([mockExpensePendingApproval]),
            });
            return;
        }

        if (method === 'POST' && /\/expenses\/?$/.test(path)) {
            await route.fulfill({
                status: 201,
                contentType: 'application/json',
                body: JSON.stringify({
                    id: 'e2e-exp-new',
                    description: 'Nova despesa E2E',
                    amount: 100,
                    status: 'PREVISTO',
                }),
            });
            return;
        }

        if (method === 'PUT' && /\/expenses\/[^/]+$/.test(path)) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ ...mockExpensePendingApproval, status: 'APROVADO' }),
            });
            return;
        }

        if (method === 'GET' && path.includes(`/projects/${E2E_PROJECT_ID}/followups`)) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([mockFollowUpForReschedule]),
            });
            return;
        }

        if (method === 'POST' && path.includes(`/projects/${E2E_PROJECT_ID}/followups`)) {
            await route.fulfill({
                status: 201,
                contentType: 'application/json',
                body: JSON.stringify({ id: 'e2e-fu-new', title: 'Follow-up E2E' }),
            });
            return;
        }

        if (method === 'POST' && path.match(/\/projects\/[^/]+\/followups\/[^/]+\/reschedule\/?$/)) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ ok: true }),
            });
            return;
        }

        if (method === 'GET' && path.includes(`/projects/${E2E_PROJECT_ID}/minutes`)) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([]),
            });
            return;
        }

        if (method === 'GET' && path.includes(`/projects/${E2E_PROJECT_ID}/proposals`)) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([mockProposalWinner]),
            });
            return;
        }

        if (method === 'POST' && path.match(/\/projects\/[^/]+\/proposals\/[^/]+\/payment-condition\/?$/)) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ ok: true }),
            });
            return;
        }

        if (method === 'GET' && path.includes(`/projects/${E2E_PROJECT_ID}/risks`)) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([mockProjectRiskForView]),
            });
            return;
        }

        if (method === 'POST' && path.match(/\/projects\/[^/]+\/risks\/?$/)) {
            await route.fulfill({
                status: 201,
                contentType: 'application/json',
                body: JSON.stringify({ id: 'e2e-risk-new', description: 'Novo risco E2E' }),
            });
            return;
        }

        if (method === 'GET' && path.includes(`/project-tasks/project/${E2E_PROJECT_ID}`)) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([]),
            });
            return;
        }

        if (method === 'GET' && path.endsWith(`/projects/${E2E_PROJECT_ID}`)) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(mockProjectE2E),
            });
            return;
        }

        if (method === 'GET' && /\/departments\/?$/.test(path)) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([
                    { id: 'e2e-dept-1', code: 'DIR-E2E', name: 'Diretoria E2E', director: null, _count: { costCenters: 0 } },
                ]),
            });
            return;
        }

        if (method === 'GET' && /\/cost-centers\/?$/.test(path)) {
            await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(refCostCenters) });
            return;
        }

        if (method === 'GET' && path.endsWith('/users') && !path.includes('/reference/')) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(refUsers),
            });
            return;
        }

        if (method === 'GET' && path.endsWith('/integrations')) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([{ type: 'LDAP', isEnabled: false, config: null, lastSync: null }]),
            });
            return;
        }

        if (method === 'GET' && path.endsWith('/roles')) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([
                    { id: 'e2e-role-1', name: 'Perfil E2E', description: 'Perfil para testes', permissions: [] },
                ]),
            });
            return;
        }

        if (method === 'GET' && path.endsWith('/tenants')) {
            await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
            return;
        }

        if (method === 'GET' && path.includes('/changes')) {
            await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
            return;
        }

        if (method === 'GET' && path.includes('/budgets')) {
            await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
            return;
        }

        if (method === 'GET' && /\/projects\/?$/.test(path)) {
            await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
            return;
        }

        if (method === 'GET' && path.includes('/assets') && !path.includes('/maintenances')) {
            await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
            return;
        }

        if (method === 'GET' && /\/incidents\/?$/.test(path)) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([
                    {
                        id: mockIncidentFull.id,
                        code: mockIncidentFull.code,
                        title: mockIncidentFull.title,
                        status: mockIncidentFull.status,
                        priority: mockIncidentFull.priority,
                        categoryId: mockIncidentFull.categoryId,
                        category: { name: 'Categoria E2E' },
                        slaBreached: false,
                        createdAt: mockIncidentFull.createdAt,
                    },
                ]),
            });
            return;
        }

        if (method === 'GET' && path.includes('/incidents')) {
            await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
            return;
        }

        if (method === 'GET') {
            await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
            return;
        }

        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ ok: true }),
        });
    });
}
