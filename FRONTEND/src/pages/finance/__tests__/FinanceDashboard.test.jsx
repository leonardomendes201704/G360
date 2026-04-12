import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import FinanceDashboard from '../FinanceDashboard';
import { ThemeContext } from '../../../contexts/ThemeContext';
import { AuthContext } from '../../../contexts/AuthContext';
import * as financeService from '../../../services/finance-dashboard.service';
import * as referenceService from '../../../services/reference.service';
import fiscalYearService from '../../../services/fiscal-year.service';

// Mock contexts
const mockThemeContext = { mode: 'light' };
const mockAuthContext = { user: { id: 'test-admin', role: 'ADMIN' }, hasPermission: () => true };

// Mock utilities and subcomponents
vi.mock('@mui/x-charts/LineChart', () => ({ LineChart: () => <div data-testid="line-chart" /> }));
vi.mock('@mui/x-charts/PieChart', () => ({ PieChart: () => <div data-testid="pie-chart" /> }));
vi.mock('../../../components/dashboard/DashboardCustomizer', () => ({ default: () => <div data-testid="customizer" /> }));

// Mock API calls
vi.mock('../../../services/finance-dashboard.service', () => ({
    getBudgetOverview: vi.fn(),
    getMonthlyEvolution: vi.fn(),
    getInsights: vi.fn(),
    getCostCenterPerformance: vi.fn(),
}));

vi.mock('../../../services/reference.service', () => ({
    getReferenceSuppliers: vi.fn(),
    getReferenceAccounts: vi.fn(),
    getReferenceCostCenters: vi.fn(),
}));

vi.mock('../../../services/fiscal-year.service', () => ({
    default: { getAll: vi.fn() }
}));

const renderWithContexts = (ui) => {
    return render(
        <ThemeContext.Provider value={mockThemeContext}>
            <AuthContext.Provider value={mockAuthContext}>
                {ui}
            </AuthContext.Provider>
        </ThemeContext.Provider>
    );
};

describe('FinanceDashboard', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Clear local storage for widget definitions
        localStorage.clear();

        // Default Reference Mocks
        fiscalYearService.getAll.mockResolvedValue([{ id: '1', year: 2025 }]);
        referenceService.getReferenceAccounts.mockResolvedValue([{ id: 'a1', name: 'Software' }]);
        referenceService.getReferenceCostCenters.mockResolvedValue([{ id: 'cc1', name: 'IT' }]);
        referenceService.getReferenceSuppliers.mockResolvedValue([{ id: 's1', name: 'AWS' }]);

        // Default Dashboard Mocks
        financeService.getBudgetOverview.mockResolvedValue({
            totalBudget: 150000,
            totalSpent: 45000,
            available: 105000,
            consumption: 30,
            unplannedSpent: 5000
        });
        financeService.getMonthlyEvolution.mockResolvedValue({
            labels: ['Jan', 'Fev'], planned: [10000, 10000], actual: [8000, 9000]
        });
        financeService.getInsights.mockResolvedValue({
            alerts: [{ name: 'IT Overrun', value: 2000 }],
            savings: [],
            forecast: { dailyBurnRate: 500, projectedTotal: 182500, status: 'RISK' }
        });
        financeService.getCostCenterPerformance.mockResolvedValue([
            { code: '001', name: 'IT', planned: 50000, actual: 40000 }
        ]);
    });

    it('renders loading skeletons initially', () => {
        // Need to delay mock resolution slightly to catch loading state if needed, 
        // but with React 18 / Testing Library we can just assert right away since data loads in useEffect
        const { container } = renderWithContexts(<FinanceDashboard />);
        // Checking for skeleton presence
        expect(container.querySelectorAll('.MuiSkeleton-root').length).toBeGreaterThan(0);
    });

    it('loads and renders KPI values correctly formatting as currency', async () => {
        renderWithContexts(<FinanceDashboard />);

        expect(await screen.findByText(/Orçamento Aprovado/i)).toBeInTheDocument();
        expect(await screen.findByText(/Realizado \(YTD\)/i)).toBeInTheDocument();
        
        const budgetValue = await screen.findAllByText(/150\.000/);
        expect(budgetValue.length).toBeGreaterThan(0);

        const spentValue = await screen.findAllByText(/45\.000/);
        expect(spentValue.length).toBeGreaterThan(0);
    });

    it('renders insights, forecast and burn rate', async () => {
        renderWithContexts(<FinanceDashboard />);

        expect(await screen.findByText(/Forecast Anual/i)).toBeInTheDocument();
        const projectedValues = await screen.findAllByText(/182\.500/);
        expect(projectedValues.length).toBeGreaterThan(0);
        
        const burnRateValues = await screen.findAllByText(/500/);
        expect(burnRateValues.length).toBeGreaterThan(0);
        
        const riskText = await screen.findAllByText(/RISCO/i);
        expect(riskText.length).toBeGreaterThan(0);
    });

    it('renders cost center performance list', async () => {
        renderWithContexts(<FinanceDashboard />);

        expect(await screen.findByText(/Performance por Centro de Custo/i)).toBeInTheDocument();
        // Look for the rendered values directly
        const costCenterValue = await screen.findAllByText(/40\.000/);
        expect(costCenterValue.length).toBeGreaterThan(0);
    });
});
