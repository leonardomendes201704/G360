import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import OrganizationPage from '../OrganizationPage';
import { ThemeContext } from '../../../contexts/ThemeContext';
import { AuthContext } from '../../../contexts/AuthContext';
import { SnackbarProvider } from 'notistack';
import departmentService from '../../../services/department.service';
import costCenterService from '../../../services/cost-center.service';

// Mock Services
vi.mock('../../../services/department.service');
vi.mock('../../../services/cost-center.service');

// Mock Sub-Tabs (except DepartmentsTab/CostCentersTab which are defined in the file - wait, they are internal components in the same file?)
// Yes, DepartmentsTab and CostCentersTab are defined IN OrganizationPage.jsx. 
// So they will assume the mocks.
// But OrganizationPage imports other tabs: IntegrationsTab, UsersTab, etc. from component files.
// We should mock those to avoid complexity.
vi.mock('../../../components/config/IntegrationsTab', () => ({ default: () => <div>Integrations Tab</div> }));
vi.mock('../../../components/config/UsersTab', () => ({ default: () => <div>Users Tab</div> }));
vi.mock('../../../components/config/RolesTab', () => ({ default: () => <div>Roles Tab</div> }));
vi.mock('../../../components/config/TenantsTab', () => ({ default: () => <div>Tenants Tab</div> }));
vi.mock('../../../components/config/FiscalYearTab', () => ({ default: () => <div>Fiscal Year Tab</div> }));
vi.mock('../../../components/admin/FreezeWindowsTab', () => ({ default: () => <div>Freeze Windows Tab</div> }));
vi.mock('../../../components/admin/CabMembersTab', () => ({ default: () => <div>Cab Members Tab</div> }));
vi.mock('../../../components/config/KnowledgeCategoriesTab', () => ({ default: () => <div>KB Categories Tab</div> }));
vi.mock('../../../components/config/ChangelogTab', () => ({ default: () => <div>Changelog Tab</div> }));
vi.mock('../../../components/modals/DepartmentModal', () => ({ default: () => <div>Dept Modal</div> }));
vi.mock('../../../components/modals/CostCenterModal', () => ({ default: () => <div>CC Modal</div> }));
vi.mock('../../../components/common/ConfirmDialog', () => ({ default: () => <div>Confirm Dialog</div> }));

const renderWithProviders = (ui, role = 'Admin') => {
    const mockUser = { id: 'u1', name: 'Admin', role: { name: role }, schema: 'public' };
    return render(
        <MemoryRouter>
            <SnackbarProvider>
                <AuthContext.Provider value={{ user: mockUser, hasPermission: () => true }}>
                    <ThemeContext.Provider value={{ mode: 'light' }}>
                        {ui}
                    </ThemeContext.Provider>
                </AuthContext.Provider>
            </SnackbarProvider>
        </MemoryRouter>
    );
};

describe('OrganizationPage', () => {
    const mockDepts = [{ id: 'd1', code: 'DEPT-001', name: 'Engineering', director: { name: 'Alice' } }];
    const mockCCs = [{ id: 'cc1', code: 'CC-101', name: 'DevOps', department: { name: 'Engineering' } }];

    beforeEach(() => {
        vi.clearAllMocks();
        departmentService.getAll.mockResolvedValue(mockDepts);
        costCenterService.getAll.mockResolvedValue(mockCCs);
    });

    it('should render Departments tab by default', async () => {
        renderWithProviders(<OrganizationPage />);

        await waitFor(() => expect(screen.getByText('Diretorias & Departamentos')).toBeInTheDocument());
        expect(screen.getByText('DEPT-001')).toBeInTheDocument();
        expect(screen.getByText('Engineering')).toBeInTheDocument();
    });

    it('should switch to Cost Centers tab', async () => {
        renderWithProviders(<OrganizationPage />);

        const ccTab = screen.getByRole('button', { name: /Centros de Custo/i });
        fireEvent.click(ccTab);

        // Header inside tab might take a moment to render if state update is slow
        expect(await screen.findByText('Novo Centro de Custo')).toBeInTheDocument();

        expect(await screen.findByText('CC-101')).toBeInTheDocument();
    });

    it('should show Tenants and Notas de versão tabs for Super Admin', async () => {
        renderWithProviders(<OrganizationPage />, 'Super Admin');

        expect(screen.getByText('Gestao de Empresas')).toBeInTheDocument();
        expect(screen.getByTestId('org-tab-changelog')).toBeInTheDocument();
        expect(screen.getByText('Tenants Tab')).toBeInTheDocument();
    });
});
