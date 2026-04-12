import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import GlobalRiskModal from '../GlobalRiskModal';
import { SnackbarProvider } from 'notistack';
import * as corporateRiskService from '../../../services/corporate-risk.service';
import * as userService from '../../../services/user.service';
import * as departmentService from '../../../services/department.service';
import * as costCenterService from '../../../services/cost-center.service';
import * as assetService from '../../../services/asset.service';

// Mock Services
vi.mock('../../../services/corporate-risk.service');
vi.mock('../../../services/user.service');
vi.mock('../../../services/department.service');
vi.mock('../../../services/cost-center.service');
vi.mock('../../../services/asset.service');

const renderWithProviders = (ui) => {
    return render(
        <SnackbarProvider>
            {ui}
        </SnackbarProvider>
    );
};

describe('GlobalRiskModal', () => {
    const mockOnSave = vi.fn();
    const mockOnClose = vi.fn();

    const mockDepartments = [{ id: 'dept1', name: 'IT Dept' }];
    const mockCostCenters = [{ id: 'cc1', name: 'Infrastructure', departmentId: 'dept1', managerId: 'user1' }];
    const mockUsers = [{ id: 'user1', name: 'John Doe' }];
    const mockAssets = [{ id: 'asset1', name: 'Server 01' }];

    beforeEach(() => {
        vi.clearAllMocks();
        departmentService.getDepartments.mockResolvedValue(mockDepartments);
        costCenterService.getCostCenters.mockResolvedValue(mockCostCenters);
        userService.getUsers.mockResolvedValue(mockUsers);
        assetService.getAssets.mockResolvedValue(mockAssets);
    });

    it('should navigate through wizard steps', async () => {
        const { container } = renderWithProviders(<GlobalRiskModal open={true} onClose={mockOnClose} onSave={mockOnSave} />);

        // Step 1: Identification
        expect(screen.getByText('IDENTIFICAÇÃO')).toBeInTheDocument();
        expect(screen.getByText('O QUE E ONDE')).toBeInTheDocument();

        // Fill Title
        const titleInput = screen.getByPlaceholderText('Resumo curto do evento de risco');
        fireEvent.change(titleInput, { target: { value: 'Data Loss' } });

        // Select Department & Cost Center
        // eslint-disable-next-line testing-library/no-node-access
        const selects = document.querySelectorAll('select');
        fireEvent.change(selects[0], { target: { value: 'dept1' } }); // Dept

        // Wait for Cost Center to filter/enable? (It depends on re-render, test might need waitFor but let's try direct)
        // Note: The component filters CCs based on Dept.
        fireEvent.change(selects[1], { target: { value: 'cc1' } }); // Cost Center

        // Click Next
        const nextBtn = screen.getByText('Próximo');
        fireEvent.click(nextBtn);

        // Step 2: Evaluation
        expect(await screen.findByText('MATRIZ DE RISCO')).toBeInTheDocument();
        expect(screen.getByText('AVALIAÇÃO')).toBeInTheDocument();
    });

    it('should calculate Strategy based on Impact x Probability', async () => {
        const { container } = renderWithProviders(<GlobalRiskModal open={true} onClose={mockOnClose} onSave={mockOnSave} />);

        // Go to Step 2
        fireEvent.click(screen.getByText('Próximo'));

        // Selects in Step 2: Category, Prob, Impact
        // Note: inputs might be hidden if Step 1 is active? 
        // The modal uses CSS display:none for steps. So elements are in DOM but hidden.
        // We can interact with them if we force visibility or just rely on react state.
        // But `fireEvent` usually works if element is in DOM. `userEvent` checks visibility.
        // Let's assume fireEvent works or we actually clicked Next.

        // Wait for transition
        await waitFor(() => expect(screen.getByText('MATRIZ DE RISCO')).toBeVisible());

        // eslint-disable-next-line testing-library/no-node-access
        const selects = document.querySelectorAll('.wizard-step.active select');
        // 0: Category, 1: Prob, 2: Impact, 3: Asset

        const probSelect = selects[1];
        const impactSelect = selects[2];

        // Scenario 1: Low Risk (1 * 1 = 1) -> ACEITAR
        fireEvent.change(probSelect, { target: { value: '1' } });
        fireEvent.change(impactSelect, { target: { value: '1' } });
        expect(screen.getByText(/ACEITAR/)).toBeInTheDocument();

        // Scenario 2: Critical Risk (3 * 3 = 9) -> MITIGAR
        fireEvent.change(probSelect, { target: { value: '3' } }); // Alta
        fireEvent.change(impactSelect, { target: { value: '3' } }); // Alto
        expect(screen.getByText(/MITIGAR/)).toBeInTheDocument();
    });
});
