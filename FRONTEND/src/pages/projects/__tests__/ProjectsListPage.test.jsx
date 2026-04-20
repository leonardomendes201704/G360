import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ProjectsListPage from '../ProjectsListPage';
import { SnackbarProvider } from 'notistack';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '../../../contexts/AuthContext';
import * as projectService from '../../../services/project.service';
import * as referenceService from '../../../services/reference.service';

// Mock Services
vi.mock('../../../services/project.service');
vi.mock('../../../services/reference.service');

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

// Auth & Permission mocks
vi.mock('../../../hooks/useAuth', () => ({ default: () => ({ user: { id: '1', name: 'Test', roles: [{ name: 'Super Admin' }] }, token: 't', hasRole: () => true }) }));

const authValue = { hasPermission: () => true, user: { id: '1', roles: [{ name: 'Test' }] }, login: () => {}, logout: () => {} };

const renderWithProviders = (ui, { initialEntries = ['/projects'] } = {}) => {
    return render(
        <SnackbarProvider>
            <AuthContext.Provider value={authValue}>
                <MemoryRouter initialEntries={initialEntries}>
                    {ui}
                </MemoryRouter>
            </AuthContext.Provider>
        </SnackbarProvider>
    );
};

describe('ProjectsListPage', () => {
    const mockProjects = [
        { id: 1, name: 'Project Alpha', code: 'PROJ-001', status: 'IN_PROGRESS', approvalStatus: 'APPROVED', progress: 50, manager: { name: 'Manager A' }, startDate: '2024-01-01', endDate: '2024-12-31' },
        { id: 2, name: 'Project Beta', code: 'PROJ-002', status: 'PLANNING', approvalStatus: 'APPROVED', progress: 0, manager: { name: 'Manager B' }, startDate: '2024-02-01', endDate: '2024-11-30' }
    ];
    const mockUsers = [{ id: 1, name: 'Manager A' }, { id: 2, name: 'Manager B' }];

    beforeEach(() => {
        vi.clearAllMocks();
        mockNavigate.mockClear();
        projectService.getProjects.mockResolvedValue(mockProjects);
        referenceService.getReferenceUsers.mockResolvedValue(mockUsers);
    });

    it('should render projects list after loading', async () => {
        renderWithProviders(<ProjectsListPage />);

        await waitFor(() => expect(screen.queryByText('Carregando...')).not.toBeInTheDocument());

        expect(screen.getByText('Project Alpha')).toBeInTheDocument();
        expect(screen.getByText('Project Beta')).toBeInTheDocument();
        expect(screen.getAllByText('Manager A').length).toBeGreaterThan(0);
    });

    it('should filter projects when searching', async () => {
        renderWithProviders(<ProjectsListPage />);
        await waitFor(() => expect(screen.queryByText('Carregando...')).not.toBeInTheDocument());

        const searchInput = screen.getByTestId('input-busca-projeto');
        fireEvent.change(searchInput, { target: { value: 'Alpha' } });

        // Debounce might delay call, we wait
        await waitFor(() => {
            expect(projectService.getProjects).toHaveBeenCalledWith(expect.objectContaining({ search: 'Alpha' }));
        });
    });

    it('should navigate to new project page', async () => {
        renderWithProviders(<ProjectsListPage />);
        await waitFor(() => expect(screen.queryByText('Carregando...')).not.toBeInTheDocument());

        const newButton = screen.getByTestId('btn-novo-projeto');
        fireEvent.click(newButton);

        expect(mockNavigate).toHaveBeenCalledWith('/projects/new');
    });
});
