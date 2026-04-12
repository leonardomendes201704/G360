import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import DashboardPage from '../DashboardPage';
import { AuthContext } from '../../../contexts/AuthContext';
import { ThemeContext } from '../../../contexts/ThemeContext';
import { MemoryRouter } from 'react-router-dom';
import api from '../../../services/api';

// Mock API and Services
vi.mock('../../../services/api');
vi.mock('../../../services/project.service');
vi.mock('../../../services/task.service');
vi.mock('../../../services/change-request.service');

// Mock components that might cause issues in isolation
vi.mock('../../../components/modals/ProjectModal', () => ({ default: () => null }));
vi.mock('../../../components/modals/TaskModal', () => ({ default: () => null }));
vi.mock('../../../components/modals/ChangeModal', () => ({ default: () => null }));

// Helper to render with providers
const renderWithContext = (ui, { user, themeMode = 'light' } = {}) => {
    return render(
        <AuthContext.Provider value={{ user, hasPermission: () => true }}>
            <ThemeContext.Provider value={{ mode: themeMode }}>
                <MemoryRouter>
                    {ui}
                </MemoryRouter>
            </ThemeContext.Provider>
        </AuthContext.Provider>
    );
};

describe('DashboardPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Default mocks for widget requests
        api.get.mockImplementation((url) => {
            if (url.includes('/tasks')) return Promise.resolve({ data: [] });
            if (url.includes('/corporate-risks')) return Promise.resolve({ data: [] });
            if (url.includes('/approvals')) return Promise.resolve({ data: [] });
            if (url.includes('/assets')) return Promise.resolve({ data: [] });
            if (url.includes('/contracts')) return Promise.resolve({ data: [] });
            if (url.includes('/change-requests')) return Promise.resolve({ data: [] });
            if (url.includes('/projects')) return Promise.resolve({ data: [] });
            return Promise.resolve({ data: [] });
        });
    });

    it('should render widgets for Super Admin user', async () => {
        const user = { name: 'Admin User', roles: [{ name: 'Super Admin' }] };

        renderWithContext(<DashboardPage />, { user });

        expect(await screen.findByText(/Admin/i)).toBeInTheDocument();
        // Check for some default widgets to be visible
        expect(screen.getByText('Minhas Tarefas')).toBeInTheDocument();
        expect(screen.getByText('Aprovações Pendentes')).toBeInTheDocument();
    });

    it('should only render permitted widgets for standard user', async () => {
        // User with ONLY Tasks permission
        const user = {
            name: 'John Doe',
            roles: [{ name: 'Collaborator', permissions: [{ module: 'TASKS', action: 'READ' }] }],
        };

        renderWithContext(<DashboardPage />, { user });

        expect(await screen.findByText(/John/i)).toBeInTheDocument();
        expect(screen.getByText('Minhas Tarefas')).toBeInTheDocument(); // Default no module required
        expect(screen.queryByText('Projetos Ativos')).not.toBeInTheDocument(); // Needs PROJECTS permission
    });
});

