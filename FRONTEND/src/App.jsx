import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useContext } from 'react';
import { Box, CircularProgress, Typography, Grid, Paper } from '@mui/material';
import { AuthProvider, AuthContext } from './contexts/AuthContext';
import { TaskTimerProvider } from './contexts/TaskTimerContext';
import FloatingTimer from './components/tasks/FloatingTimer';

// Layout
import MainLayout from './components/layout/MainLayout';

// Páginas Públicas
import LoginPage from './pages/auth/LoginPage';
import AuthCallbackPage from './pages/auth/AuthCallbackPage';

// Páginas Protegidas
import DashboardPage from './pages/dashboard/DashboardPage'; // <--- UPDATED
import DashboardRouter from './pages/dashboard/DashboardRouter'; // <--- NEW ROUTER
import ModernDashboardPage from './pages/dashboard/ModernDashboardPage'; // <--- NEW DEMO
import ProjectsListPage from './pages/projects/ProjectsListPage';
import ProjectDetailsPage from './pages/projects/ProjectDetailsPage';
import ProjectGanttPage from './pages/projects/ProjectGanttPage';
import ProjectFormPage from './pages/projects/ProjectFormPage';
import TeamProjectsStatusReport from './pages/projects/TeamProjectsStatusReport';
import PortfolioDashboard from './pages/projects/PortfolioDashboard';
import TasksPage from './pages/tasks/TasksPage';
import TimeReportPage from './pages/tasks/TimeReportPage';



import ChangeRequestsPage from './pages/changes/ChangeRequestsPage';
import ChangeRequestDetailPage from './pages/changes/ChangeRequestDetailPage';
import { GmudNewRouteRedirect, GmudEditRouteRedirect } from './pages/changes/GmudFormRouteRedirect';
import IncidentsPage from './pages/incidents/IncidentsPage';
import SuppliersPage from './pages/suppliers/SuppliersPage';
import ContractsPage from './pages/contracts/ContractsPage';
import ContractDetailsPage from './pages/contracts/ContractDetailsPage';
import FinancePage from './pages/finance/FinancePage';
import BudgetDetailsPage from './pages/finance/BudgetDetailsPage';
import BudgetComparisonPage from './pages/finance/BudgetComparisonPage';
import AssetsPage from './pages/assets/AssetsPage';
import RisksPage from './pages/RisksPage'; // <--- NEW MODULE
import KnowledgeBasePage from './pages/KnowledgeBasePage';
// Configurações
import OrganizationPage from './pages/config/OrganizationPage';
import ActivityLogPage from './pages/admin/ActivityLogPage';
import MyApprovalsPage from './pages/approvals/MyApprovalsPage';
import TenantAdminPage from './pages/admin/TenantAdminPage';
import GlobalSettingsPage from './pages/admin/GlobalSettingsPage';

// Help Desk / Service Desk
import PortalPage from './pages/helpdesk/PortalPage';
import TicketDetails from './pages/helpdesk/TicketDetails';
import ServiceDeskDashboard from './pages/servicedesk/ServiceDeskDashboard';
import ServiceDeskSettings from './pages/servicedesk/ServiceDeskSettings';
import CatalogAdmin from './pages/servicedesk/CatalogAdmin';
import ProblemManagement from './pages/helpdesk/ProblemManagement';

const PrivateRoute = () => {
  const { authenticated, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  // Layout aplicado automaticamente para rotas protegidas
  return authenticated ? (
    <MainLayout>
      <Outlet />
      <FloatingTimer />
    </MainLayout>
  ) : (
    <Navigate to="/login" />
  );
};

/** Rota autenticada sem shell (sidebar) — ex.: Gantt em ecrã inteiro. */
const PrivateRouteBare = () => {
  const { authenticated, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return authenticated ? <Outlet /> : <Navigate to="/login" />;
};

// 3. Aplicação Principal
function App() {
  return (
    <AuthProvider>
      <TaskTimerProvider>
        <Routes>
          {/* Rota Pública */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />

          <Route element={<PrivateRouteBare />}>
            <Route path="/projects/:id/gantt" element={<ProjectGanttPage />} />
          </Route>

          {/* Rotas Protegidas */}
          <Route element={<PrivateRoute />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/modern-dashboard" element={<ModernDashboardPage />} />  {/* <--- NEW DEMO */}
            <Route path="/dashboard" element={<DashboardRouter />} />  {/* <--- UPDATED */}

            {/* Módulos de Projetos */}
            <Route path="/projects" element={<ProjectsListPage />} />
            <Route path="/projects/portfolio" element={<PortfolioDashboard />} />
            <Route path="/projects/team-status-report" element={<TeamProjectsStatusReport />} /> {/* <--- NEW ROUTE */}
            <Route path="/projects/new" element={<ProjectFormPage />} />
            <Route path="/projects/:id/edit" element={<ProjectFormPage />} />
            <Route path="/projects/:id" element={<ProjectDetailsPage />} />

            {/* Módulos Operacionais */}
            <Route path="/tasks" element={<TasksPage />} />
            <Route path="/tasks/time-report" element={<TimeReportPage />} />
            <Route path="/tasks/:id" element={<TasksPage />} />

            {/* Knowledge Base */}
            <Route path="/knowledge" element={<KnowledgeBasePage />} />

            <Route path="/changes/new" element={<GmudNewRouteRedirect />} />
            <Route path="/changes/:id/edit" element={<GmudEditRouteRedirect />} />
            <Route path="/changes/:id" element={<ChangeRequestDetailPage />} />
            <Route path="/changes" element={<ChangeRequestsPage />} />
            <Route path="/incidents" element={<IncidentsPage />} />
            <Route path="/assets" element={<AssetsPage />} />
            <Route path="/risks" element={<RisksPage />} /> {/* <--- NEW ROUTE */}

            {/* Módulos Administrativos & Financeiros */}
            <Route path="/suppliers" element={<SuppliersPage />} />
            <Route path="/contracts" element={<ContractsPage />} />
            <Route path="/contracts/:id" element={<ContractDetailsPage />} />

            <Route path="/finance" element={<FinancePage />} />
            <Route path="/finance/budget/:id" element={<BudgetDetailsPage />} />
            <Route path="/finance/compare" element={<BudgetComparisonPage />} />

            {/* Configurações */}

            <Route path="/activities" element={<ActivityLogPage />} />
            <Route path="/approvals" element={<MyApprovalsPage />} />
            <Route path="/config/organization" element={<OrganizationPage />} />
            <Route path="/config/tenants" element={<TenantAdminPage />} />
            <Route path="/config/global" element={<GlobalSettingsPage />} />
            
            {/* Help Desk / Service Desk */}
            <Route path="/portal" element={<PortalPage />} />
            <Route path="/portal/tickets/:id" element={<TicketDetails />} />
            <Route path="/servicedesk" element={<ServiceDeskDashboard />} />
            <Route path="/servicedesk/settings" element={<ServiceDeskSettings />} />
            <Route path="/servicedesk/catalog" element={<CatalogAdmin />} />
            <Route path="/servicedesk/problems" element={<ProblemManagement />} />
          </Route>

          {/* Fallback para 404 - Redireciona para Login */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </TaskTimerProvider>
    </AuthProvider>
  );
}

export default App;