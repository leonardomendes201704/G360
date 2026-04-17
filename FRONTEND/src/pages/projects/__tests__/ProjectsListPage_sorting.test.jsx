/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ProjectsListPage from '../ProjectsListPage';
import { SnackbarProvider } from 'notistack';
import { MemoryRouter } from 'react-router-dom';
import { getProjects } from '../../../services/project.service';
import * as referenceService from '../../../services/reference.service';

// Mock Services
vi.mock('../../../services/project.service');
vi.mock('../../../services/reference.service');

// Auth & Permission mocks
vi.mock('../../../hooks/useAuth', () => ({ default: () => ({ user: { id: '1', name: 'Test', roles: [{ name: 'Super Admin' }] }, token: 't', hasRole: () => true }) }));

const renderWithProviders = (ui) => {
    return render(
        <SnackbarProvider>
            <MemoryRouter>
                {ui}
            </MemoryRouter>
        </SnackbarProvider>
    );
};

describe('ProjectsListPage Sorting', () => {
    const mockProjects = [
        { id: 1, name: 'B Project', code: 'PROJ-B', status: 'PLANNING', progress: 0, manager: { name: 'Manager B' }, startDate: '2024-02-01', endDate: '2024-11-30' },
        { id: 2, name: 'A Project', code: 'PROJ-A', status: 'IN_PROGRESS', progress: 50, manager: { name: 'Manager A' }, startDate: '2024-01-01', endDate: '2024-12-31' }
    ];
    const mockUsers = [];

    beforeEach(() => {
        vi.clearAllMocks();
        getProjects.mockResolvedValue(mockProjects);
        referenceService.getReferenceUsers.mockResolvedValue(mockUsers);
    });

    it('should sort projects by name asc by default and desc on click', async () => {
        renderWithProviders(<ProjectsListPage />);
        await waitFor(() => expect(screen.queryByText('Carregando...')).not.toBeInTheDocument());

        // Default: orderBy 'name' and 'asc'.
        expect(getProjects).toHaveBeenCalledWith(expect.objectContaining({ sortBy: 'name', sortDirection: 'asc' }));

        // Click on "Projeto" header to reverse
        const nameHeader = screen.getByText('Projeto');
        fireEvent.click(nameHeader);

        // Now should be Descending
        await waitFor(() => {
            expect(getProjects).toHaveBeenCalledWith(expect.objectContaining({ sortBy: 'name', sortDirection: 'desc' }));
        });
    });

    it('should sort by status', async () => {
        renderWithProviders(<ProjectsListPage />);
        await waitFor(() => expect(screen.queryByText('Carregando...')).not.toBeInTheDocument());

        const table = screen.getByTestId('tabela-projetos');
        const statusHeader = within(table).getByText('Status');
        fireEvent.click(statusHeader);

        // First click sets status ASC
        await waitFor(() => {
            expect(getProjects).toHaveBeenCalledWith(expect.objectContaining({ sortBy: 'status', sortDirection: 'asc' }));
        });

        // Click again for DESC
        const statusHeaderUpdated = within(screen.getByTestId('tabela-projetos')).getByText('Status');
        fireEvent.click(statusHeaderUpdated);

        await waitFor(() => {
            expect(getProjects).toHaveBeenCalledWith(expect.objectContaining({ sortBy: 'status', sortDirection: 'desc' }));
        });
    });
});
