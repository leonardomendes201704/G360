import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ActivityLogPage from '../ActivityLogPage';
import { ThemeContext } from '../../../contexts/ThemeContext';
import { SnackbarProvider } from 'notistack';
import api from '../../../services/api';

// Mock API
vi.mock('../../../services/api', () => ({
    default: {
        get: vi.fn()
    }
}));

// Mock Charts (PieChart, BarChart)
vi.mock('@mui/x-charts/PieChart', () => ({ PieChart: () => <div>PieChart Mock</div> }));
vi.mock('@mui/x-charts/BarChart', () => ({ BarChart: () => <div>BarChart Mock</div> }));

// Auth & Permission mocks
vi.mock('../../../hooks/useAuth', () => ({ default: () => ({ user: { id: '1', name: 'Test', roles: [{ name: 'Super Admin' }] }, token: 't', hasRole: () => true }) }));

const renderWithProviders = (ui) => {
    return render(
        <SnackbarProvider>
            <ThemeContext.Provider value={{ mode: 'light' }}>
                {ui}
            </ThemeContext.Provider>
        </SnackbarProvider>
    );
};

describe('ActivityLogPage', () => {
    const mockLogs = {
        data: [
            { id: 1, action: 'CREATE', module: 'CONTRACTS', entityType: 'Contract', createdAt: new Date().toISOString(), user: { name: 'Admin' } },
            { id: 2, action: 'DELETE', module: 'CONFIG', entityType: 'User', createdAt: new Date().toISOString(), user: { name: 'Admin' } }
        ],
        pagination: { pages: 1, total: 2 }
    };

    beforeEach(() => {
        vi.clearAllMocks();
        api.get.mockResolvedValue({ data: mockLogs });
    });

    it('should render Dashboard KPIs', async () => {
        renderWithProviders(<ActivityLogPage />);

        // Wait for fetch
        await waitFor(() => expect(screen.getByText('Total de Atividades')).toBeInTheDocument());

        // Check Values
        expect(screen.getAllByText('2').length).toBeGreaterThanOrEqual(1); // 2 Total
        expect(screen.getByText('PieChart Mock')).toBeInTheDocument();
    });

    it('should switch to List View and show logs', async () => {
        renderWithProviders(<ActivityLogPage />);

        await waitFor(() => expect(screen.getByText('Total de Atividades')).toBeInTheDocument());

        // Switch to List
        const listBtn = screen.getByText('Atividades'); // Button text
        fireEvent.click(listBtn);

        expect(screen.getByText('Log de Atividades')).toBeInTheDocument();
        expect(screen.getByText('Criou contract')).toBeInTheDocument(); // Formatted text: CREATE -> Criou
        expect(screen.getByText('Excluiu user')).toBeInTheDocument();
    });
});
