import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import RisksPage from '../RisksPage';
import { ThemeContext } from '../../contexts/ThemeContext';
import { SnackbarProvider } from 'notistack';
import * as corporateRiskService from '../../services/corporate-risk.service';
import * as userService from '../../services/user.service';

// Mock Services
vi.mock('../../services/corporate-risk.service');
vi.mock('../../services/user.service');

// Mock Child Components
vi.mock('../../components/risks/RiskHeatmap', () => ({
    default: ({ data }) => <div data-testid="risk-heatmap">Heatmap: {data?.length} Items</div>
}));
vi.mock('../../components/modals/GlobalRiskModal', () => ({
    default: ({ open, onClose }) => open ? <div data-testid="risk-modal"><button onClick={onClose}>Close</button></div> : null
}));
vi.mock('../../components/modals/TaskModal', () => ({
    default: () => <div data-testid="task-modal">Task Modal</div>
}));
vi.mock('../../components/common/ConfirmDialog', () => ({
    default: ({ open, onConfirm }) => open ? <div data-testid="confirm-dialog"><button onClick={onConfirm}>Confirm</button></div> : null
}));

// Auth & Permission mocks
vi.mock('../../hooks/useAuth', () => ({ default: () => ({ user: { id: '1', name: 'Test', roles: [{ name: 'Super Admin' }] }, token: 't', hasRole: () => true }) }));

const renderWithProviders = (ui) => {
    return render(
        <SnackbarProvider>
            <ThemeContext.Provider value={{ mode: 'light' }}>
                {ui}
            </ThemeContext.Provider>
        </SnackbarProvider>
    );
};

describe('RisksPage', () => {
    const mockRisks = [
        { id: 1, title: 'Server Down', code: 'RISK-001', severity: 16, status: 'IDENTIFICADO', category: 'TI' }, // Critical
        { id: 2, title: 'Data Leak', code: 'RISK-002', severity: 9, status: 'TRATAMENTO', category: 'SEGURANCA' } // High/Medium
    ];
    const mockHeatmap = [{ x: 1, y: 1, value: 5 }];

    beforeEach(() => {
        vi.clearAllMocks();
        corporateRiskService.getRisks.mockResolvedValue(mockRisks);
        corporateRiskService.getHeatmapMetrics.mockResolvedValue(mockHeatmap);
        userService.getUsers.mockResolvedValue([]);
    });

    it('should render Dashboard with Heatmap and Top Risks', async () => {
        renderWithProviders(<RisksPage />);

        // Header
        await waitFor(() => expect(screen.getByText('Gestão de Riscos Corporativos')).toBeInTheDocument());

        // Heatmap
        expect(screen.getByTestId('risk-heatmap')).toBeInTheDocument();

        // Top Risks (Critical >= 16)
        expect(screen.getByText('Top Riscos Críticos')).toBeInTheDocument();
        expect(screen.getByText('RISK-001')).toBeInTheDocument(); // Critical
        expect(screen.queryByText('RISK-002')).not.toBeInTheDocument(); // Not Critical enough for Top list (logic: severity >= 16)
    });

    it('should switch to List view and show filtered table', async () => {
        const { container } = renderWithProviders(<RisksPage />);
        await waitFor(() => expect(screen.getByText('Gestão de Riscos Corporativos')).toBeInTheDocument());

        // Switch button (List Icon)
        // Hard to find by text since it's an icon button without label text inside (just icon).
        // But we can find by aria-label if present, or by clicking the 2nd button in the group.
        // Looking at code: <IconButton ... onClick={() => setViewMode('LIST')}><ListIcon /></IconButton>
        // It's the second IconButton in the header box.

        // Let's use `fireEvent.click(container.querySelectorAll('button')[1])` (Risky)
        // Or find by the icon class if necessary.
        // Better: Dashboard view is default. List view table is not present.
        expect(screen.queryByRole('table')).not.toBeInTheDocument();

        // Find the button (assuming order: Dashboard, List)
        // We can look for the Dashboard icon and find its sibling.
        // Or just getAllByRole('button') and click the one that looks like a list view.

        const buttons = screen.getAllByRole('button');
        // Buttons: 0=Dashboard, 1=List, 2=Novo Risco (with Text)
        // Safe assumption given the layout.
        fireEvent.click(buttons[1]);

        expect(await screen.findByRole('table')).toBeInTheDocument();
        expect(screen.getByText('Server Down')).toBeInTheDocument();
        expect(screen.getByText('Data Leak')).toBeInTheDocument();
    });

    it('should open New Risk Modal', async () => {
        renderWithProviders(<RisksPage />);
        await waitFor(() => expect(screen.getByText('Gestão de Riscos Corporativos')).toBeInTheDocument());

        const newBtn = screen.getByText('Novo Risco');
        fireEvent.click(newBtn);

        expect(await screen.findByTestId('risk-modal')).toBeInTheDocument();
    });
});
