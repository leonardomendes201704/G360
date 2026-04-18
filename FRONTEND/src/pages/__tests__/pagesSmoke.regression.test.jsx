/**
 * Regressão de compilação/render para páginas que não têm teste dedicado.
 * Cobre rotas em App.jsx (exceto páginas já cobertas por *.test.jsx próprio).
 *
 * Mock central: `services/api` — a maioria dos serviços delega no axios.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';

import api from '../../services/api';
import { AuthContext } from '../../contexts/AuthContext';
import {
  renderSmoke,
  renderSmokeRoute,
  smokeAuthManager,
  smokeAuthSuperAdmin,
  smokeAuthCollaborator
} from '../../test/pageSmokeUtils';

import LoginPage from '../auth/LoginPage';
import AuthCallbackPage from '../auth/AuthCallbackPage';
import ModernDashboardPage from '../dashboard/ModernDashboardPage';
import DashboardRouter from '../dashboard/DashboardRouter';
import ChangeRequestsPage from '../changes/ChangeRequestsPage';
import IncidentsPage from '../incidents/IncidentsPage';
import KnowledgeBasePage from '../KnowledgeBasePage';
import ContractsPage from '../contracts/ContractsPage';
import ContractDetailsPage from '../contracts/ContractDetailsPage';
import BudgetDetailsPage from '../finance/BudgetDetailsPage';
import ProjectDetailsPage from '../projects/ProjectDetailsPage';
import PortfolioDashboard from '../projects/PortfolioDashboard';
import TimeReportPage from '../tasks/TimeReportPage';
import TicketDetails from '../helpdesk/TicketDetails';
import ServiceDeskDashboard from '../servicedesk/ServiceDeskDashboard';
import MyApprovalsPage from '../approvals/MyApprovalsPage';
import TenantAdminPage from '../admin/TenantAdminPage';
import GlobalSettingsPage from '../admin/GlobalSettingsPage';
import CatalogAdmin from '../servicedesk/CatalogAdmin';
import ServiceDeskSettings from '../servicedesk/ServiceDeskSettings';
import { CatalogAdminPanel } from '../servicedesk/CatalogAdmin';

vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(() => Promise.resolve({ data: {} })),
    put: vi.fn(() => Promise.resolve({ data: {} })),
    patch: vi.fn(() => Promise.resolve({ data: {} })),
    delete: vi.fn(() => Promise.resolve({ data: {} })),
    defaults: { headers: { common: {} } }
  }
}));

vi.mock('../../contexts/AuthContext', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useAuth: () => ({
      user: { id: 'u1', roles: [{ name: 'Gestor' }], schema: 'tenant_a' },
      hasPermission: () => true
    })
  };
});

vi.mock('../admin/MasterDashboard', () => ({
  default: () => <div data-testid="smoke-master-dashboard">MasterDashboard</div>
}));
vi.mock('../dashboard/ManagerOverview', () => ({
  default: () => <div data-testid="smoke-manager-overview">ManagerOverview</div>
}));
vi.mock('../dashboard/CollaboratorOverview', () => ({
  default: () => <div data-testid="smoke-collaborator-overview">CollaboratorOverview</div>
}));

const mockProject = {
  id: 'p-smoke',
  name: 'Projeto Smoke',
  code: 'PRJ-SMOKE',
  status: 'IN_PROGRESS',
  approvalStatus: 'APPROVED',
  description: 'Teste',
  startDate: '2025-01-01',
  endDate: '2026-12-31',
  budget: 10000,
  actualCost: 0,
  tasks: [],
  risks: [],
  members: [],
  projectTeams: [],
  fiscalYear: { year: 2025 }
};

function installApiRouter() {
  api.get.mockImplementation((url) => {
    const path = typeof url === 'string' ? url : '';

    if (path === '/integrations/public') {
      return Promise.resolve({ data: { data: [] } });
    }
    if (path.match(/^\/tickets\/[^/?]+$/)) {
      return Promise.resolve({
        data: {
          id: 't1',
          code: 'TK-1',
          title: 'Chamado Smoke',
          status: 'OPEN',
          messages: [],
          createdAt: new Date().toISOString(),
          service: { name: 'Svc' },
          department: null,
          costCenter: null
        }
      });
    }
    if (path === '/tickets' || path.startsWith('/tickets?')) {
      return Promise.resolve({ data: [] });
    }

    if (path === '/suppliers' || path.startsWith('/suppliers?')) {
      return Promise.resolve({ data: [] });
    }

    if (path.includes('/incidents/kpis')) {
      return Promise.resolve({ data: { total: 0, open: 0 } });
    }
    if (path.includes('/incidents/categories')) {
      return Promise.resolve({ data: [] });
    }
    if (path === '/incidents' || path.includes('/incidents?')) {
      return Promise.resolve({ data: [] });
    }

    if (path.includes('/changes/metrics')) {
      return Promise.resolve({ data: {} });
    }
    if (path === '/changes' || path.includes('/changes?')) {
      return Promise.resolve({ data: [] });
    }

    if (path.startsWith('/knowledge-base/dashboard')) {
      return Promise.resolve({ data: {} });
    }
    if (path.startsWith('/knowledge-base?') || path === '/knowledge-base') {
      return Promise.resolve({ data: [] });
    }

    if (path.startsWith('/contracts') && !path.includes('/attachments')) {
      if (path.match(/^\/contracts\/[^/]+$/)) {
        return Promise.resolve({
          data: {
            id: 'c1',
            number: 'CT-1',
            title: 'Contrato',
            status: 'ACTIVE',
            supplier: { name: 'S' },
            startDate: '2025-01-01',
            endDate: '2026-01-01'
          }
        });
      }
      return Promise.resolve({ data: [] });
    }
    if (path.includes('/contracts/') && path.includes('/attachments')) {
      return Promise.resolve({ data: [] });
    }
    if (path.includes('/addendums')) {
      return Promise.resolve({ data: [] });
    }

    if (path.match(/^\/budgets\/[^/]+$/) && !path.includes('/items')) {
      return Promise.resolve({
        data: {
          id: 'b1',
          name: 'Orçamento',
          status: 'DRAFT',
          items: [],
          totalOpex: 0,
          fiscalYear: { year: 2025 }
        }
      });
    }

    if (path.match(/^\/projects\/[^/]+$/) && !path.includes('/time')) {
      return Promise.resolve({ data: mockProject });
    }
    if (path === '/projects' || path.startsWith('/projects?')) {
      return Promise.resolve({ data: [] });
    }

    if (path.includes('/tasks/time-report')) {
      return Promise.resolve({ data: { rows: [], totals: {} } });
    }
    if (path.includes('/reference/users')) {
      return Promise.resolve({ data: [] });
    }

    if (path.includes('/approvals/counts')) {
      return Promise.resolve({
        data: {
          expenses: 0,
          projectCosts: 0,
          minutes: 0,
          gmuds: 0,
          projects: 0,
          proposals: 0,
          budgets: 0,
          total: 0
        }
      });
    }
    if (path.includes('/approvals/pending')) {
      return Promise.resolve({ data: [] });
    }

    if (path === '/tenants') {
      return Promise.resolve({ data: { data: [] } });
    }
    if (path.includes('/tenants/pool-stats')) {
      return Promise.resolve({ data: { data: null } });
    }

    if (path.startsWith('/global-settings')) {
      return Promise.resolve({
        data: {
          data: {
            GENERAL: [],
            SMTP: [],
            AUTH: [],
            MAINTENANCE: []
          }
        }
      });
    }

    if (path.startsWith('/service-catalog')) {
      return Promise.resolve({ data: [] });
    }

    if (path.startsWith('/sla-policies')) {
      return Promise.resolve({ data: [] });
    }

    if (path === '/helpdesk-config') {
      return Promise.resolve({
        data: {
          triageEnabled: false,
          defaultSupportGroupId: null,
          holidays: [],
          workingHours: {}
        }
      });
    }

    if (path.includes('dashboard-stats')) {
      return Promise.resolve({ data: { data: { tenants: 0 } } });
    }

    if (path.includes('/metrics') && path.includes('health')) {
      return Promise.resolve({ data: {} });
    }

    return Promise.resolve({ data: {} });
  });
}

describe('Pages smoke (regressão JSX / render)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    installApiRouter();
  });

  it('LoginPage renderiza sem erro', async () => {
    renderSmoke(<LoginPage />, {
      AuthContext,
      authValue: {
        login: vi.fn(),
        user: null,
        loading: false,
        hasPermission: () => false
      }
    });
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /entrar/i }).length).toBeGreaterThan(0);
    });
  });

  it('AuthCallbackPage renderiza sem erro', () => {
    renderSmoke(<AuthCallbackPage />, {
      AuthContext,
      initialEntries: ['/auth/callback?error=x&error_description=y'],
      authValue: { login: vi.fn(), user: null, loading: false, hasPermission: () => false }
    });
    expect(screen.getByText(/Azure/i)).toBeInTheDocument();
  });

  it('ModernDashboardPage renderiza', () => {
    renderSmoke(<ModernDashboardPage />, { AuthContext });
    expect(screen.getByText(/Total Revenue/i)).toBeInTheDocument();
  });

  it('DashboardRouter: Super Admin → MasterDashboard mock', () => {
    renderSmoke(<DashboardRouter />, { AuthContext, authValue: smokeAuthSuperAdmin });
    expect(screen.getByTestId('smoke-master-dashboard')).toBeInTheDocument();
  });

  it('DashboardRouter: Gestor → ManagerOverview mock', () => {
    renderSmoke(<DashboardRouter />, { AuthContext, authValue: smokeAuthManager });
    expect(screen.getByTestId('smoke-manager-overview')).toBeInTheDocument();
  });

  it('DashboardRouter: Colaborador → CollaboratorOverview mock', () => {
    renderSmoke(<DashboardRouter />, { AuthContext, authValue: smokeAuthCollaborator });
    expect(screen.getByTestId('smoke-collaborator-overview')).toBeInTheDocument();
  });

  it('ChangeRequestsPage renderiza', async () => {
    renderSmoke(<ChangeRequestsPage />, { AuthContext });
    await waitFor(() => {
      expect(screen.getAllByText(/GMUD|mudança/i).length).toBeGreaterThan(0);
    });
  });

  it('IncidentsPage renderiza', async () => {
    renderSmoke(<IncidentsPage />, { AuthContext });
    await waitFor(() => {
      expect(screen.getAllByText(/Incidente/i).length).toBeGreaterThan(0);
    });
  });

  it('KnowledgeBasePage renderiza', async () => {
    renderSmoke(<KnowledgeBasePage />, { AuthContext });
    await waitFor(() => {
      expect(screen.getAllByText(/Conhecimento|Base/i).length).toBeGreaterThan(0);
    });
  });

  it('ContractsPage renderiza', async () => {
    renderSmoke(<ContractsPage />, { AuthContext });
    await waitFor(() => {
      expect(screen.getAllByText(/Contratos/i).length).toBeGreaterThan(0);
    });
  });

  it('ContractDetailsPage renderiza', async () => {
    renderSmokeRoute(<ContractDetailsPage />, '/contracts/:id', '/contracts/c1', AuthContext);
    await waitFor(() => {
      expect(screen.getByText(/Contrato|CT-1|carregando/i)).toBeTruthy();
    });
  });

  it('BudgetDetailsPage renderiza', async () => {
    renderSmokeRoute(<BudgetDetailsPage />, '/finance/budget/:id', '/finance/budget/b1', AuthContext);
    await waitFor(() => {
      expect(screen.getByText(/Orçamento|carregando/i)).toBeTruthy();
    });
  });

  it('ProjectDetailsPage renderiza', async () => {
    renderSmokeRoute(<ProjectDetailsPage />, '/projects/:id', `/projects/${mockProject.id}`, AuthContext);
    await waitFor(() => {
      expect(screen.getAllByText(/Projeto Smoke|PRJ-SMOKE/i).length).toBeGreaterThan(0);
    });
  });

  it('PortfolioDashboard renderiza', async () => {
    renderSmoke(<PortfolioDashboard />, { AuthContext });
    await waitFor(() => {
      expect(screen.getAllByText(/Portfolio|projeto/i).length).toBeGreaterThan(0);
    });
  });

  it('TimeReportPage renderiza', async () => {
    renderSmoke(<TimeReportPage />, { AuthContext });
    await waitFor(() => {
      expect(screen.getAllByText(/Relatório|Horas|tempo/i).length).toBeGreaterThan(0);
    });
  });

  it('TicketDetails renderiza', async () => {
    renderSmokeRoute(<TicketDetails />, '/portal/tickets/:id', '/portal/tickets/t1', AuthContext);
    await waitFor(() => {
      expect(screen.getAllByText(/TK-1|Chamado Smoke/i).length).toBeGreaterThan(0);
    });
  });

  it('ServiceDeskDashboard renderiza', async () => {
    renderSmoke(<ServiceDeskDashboard />, { AuthContext });
    await waitFor(() => {
      expect(screen.getByText(/Central de Serviços/i)).toBeInTheDocument();
    });
  });

  it('MyApprovalsPage renderiza', async () => {
    renderSmoke(<MyApprovalsPage />, { AuthContext });
    await waitFor(() => {
      expect(screen.getByText(/Minhas Aprovações/i)).toBeInTheDocument();
    });
  });

  it('TenantAdminPage renderiza', async () => {
    renderSmoke(<TenantAdminPage />, { AuthContext, authValue: smokeAuthSuperAdmin });
    await waitFor(() => {
      expect(screen.getAllByText(/Tenant/i).length).toBeGreaterThan(0);
    });
  });

  it('GlobalSettingsPage renderiza (Super Admin)', async () => {
    renderSmoke(<GlobalSettingsPage />, { AuthContext, authValue: smokeAuthSuperAdmin });
    await waitFor(() => {
      expect(screen.getByText(/Configurações Globais/i)).toBeInTheDocument();
    });
  });

  it('CatalogAdmin redireciona para organization', async () => {
    renderSmoke(
      <Routes>
        <Route path="/sd/cat" element={<CatalogAdmin />} />
        <Route path="/config/organization" element={<div data-testid="org-redirect-ok">Org</div>} />
      </Routes>,
      { AuthContext, initialEntries: ['/sd/cat'] }
    );
    await waitFor(() => {
      expect(screen.getByTestId('org-redirect-ok')).toBeInTheDocument();
    });
  });

  it('ServiceDeskSettings redireciona para organization', async () => {
    renderSmoke(
      <Routes>
        <Route path="/sd/set" element={<ServiceDeskSettings />} />
        <Route path="/config/organization" element={<div data-testid="org-sd-settings">Org</div>} />
      </Routes>,
      { AuthContext, initialEntries: ['/sd/set'] }
    );
    await waitFor(() => {
      expect(screen.getByTestId('org-sd-settings')).toBeInTheDocument();
    });
  });

  it('CatalogAdminPanel (catálogo embutido) renderiza', async () => {
    installApiRouter();
    api.get.mockImplementation((url) => {
      const path = typeof url === 'string' ? url : '';
      if (path.includes('service-catalog')) return Promise.resolve({ data: [] });
      if (path.includes('sla-policies')) return Promise.resolve({ data: [] });
      return Promise.resolve({ data: {} });
    });
    renderSmoke(<CatalogAdminPanel embedded />, { AuthContext });
    await waitFor(() => {
      expect(screen.getByText(/Administração do Catálogo ITBM/i)).toBeInTheDocument();
    });
  });
});
