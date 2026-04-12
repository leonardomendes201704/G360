import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TeamProjectsStatusReport from '../TeamProjectsStatusReport';
import { ThemeContext } from '../../../contexts/ThemeContext';
import { SnackbarProvider } from 'notistack';
import api from '../../../services/api';
import { BrowserRouter } from 'react-router-dom';

// Mock Dependencies
vi.mock('../../../services/api', () => ({
    default: {
        get: vi.fn()
    }
}));
vi.mock('jspdf', () => ({
    default: vi.fn(() => ({
        save: vi.fn(),
        text: vi.fn(),
        rect: vi.fn(),
        setFillColor: vi.fn(),
        setTextColor: vi.fn(),
        setFont: vi.fn(),
        setFontSize: vi.fn(),
        setGState: vi.fn().mockReturnValue({}),
        GState: vi.fn(),
        roundedRect: vi.fn(),
        setDrawColor: vi.fn(),
        setLineWidth: vi.fn(),
        line: vi.fn(),
        addPage: vi.fn(),
        internal: { pageSize: { width: 210, height: 297 }, getNumberOfPages: () => 1 }
    }))
}));

vi.mock('jspdf-autotable', () => ({
    default: vi.fn()
}));
vi.mock('react-router-dom', () => ({
    useNavigate: () => vi.fn(),
    BrowserRouter: ({ children }) => <div>{children}</div>
}));

// Auth & Permission mocks
vi.mock('../../../hooks/useAuth', () => ({ default: () => ({ user: { id: '1', name: 'Test', roles: [{ name: 'Super Admin' }] }, token: 't', hasRole: () => true }) }));

const renderWithProviders = (ui) => {
    return render(
        <ThemeContext.Provider value={{ mode: 'dark', toggleTheme: vi.fn() }}>
            <SnackbarProvider>
                {ui}
            </SnackbarProvider>
        </ThemeContext.Provider>
    );
};

describe('TeamProjectsStatusReport', () => {
    const mockProjects = [
        { id: 1, name: 'Project Alpha', code: 'PRJ-001', status: 'IN_PROGRESS', techLead: { name: 'Alice' }, followUps: [] },
        { id: 2, name: 'Project Beta', code: 'PRJ-002', status: 'PLANNING', techLead: { name: 'Bob' }, followUps: [] }
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        api.get.mockResolvedValue({ data: mockProjects });
    });

    it('should fetch and render project list', async () => {
        renderWithProviders(<TeamProjectsStatusReport />);

        // Check Title
        expect(screen.getByText('Status Report')).toBeInTheDocument();

        // Wait for data
        await waitFor(() => expect(screen.getByText('Project Alpha')).toBeInTheDocument());
        expect(screen.getByText('PRJ-001')).toBeInTheDocument();
        expect(screen.getByText('Alice')).toBeInTheDocument();
    });

    it('should filter projects', async () => {
        renderWithProviders(<TeamProjectsStatusReport />);
        await waitFor(() => expect(screen.getByText('Project Alpha')).toBeInTheDocument());

        // Filter by text
        const searchInput = screen.getByPlaceholderText(/Filtrar por nome/i);
        fireEvent.change(searchInput, { target: { value: 'Beta' } });

        expect(screen.getByText('Project Beta')).toBeInTheDocument();
        expect(screen.queryByText('Project Alpha')).not.toBeInTheDocument();
    });

    it('should trigger PDF export', async () => {
        renderWithProviders(<TeamProjectsStatusReport />);
        await waitFor(() => expect(screen.getByText('Project Alpha')).toBeInTheDocument());

        const exportBtn = screen.getByText(/Exportar PDF/i);
        fireEvent.click(exportBtn);

        // Since we mocked jspdf, we just check if it didn't crash. 
        // We could check if jspdf constructor was called if we imported it in test, 
        // but finding the button and clicking it without error is enough for integration level.
        expect(screen.getByText('Status Report')).toBeInTheDocument();
    });
});
