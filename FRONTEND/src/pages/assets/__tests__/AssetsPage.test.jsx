import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AssetsPage from '../AssetsPage';
import { ThemeContext } from '../../../contexts/ThemeContext';
import { AuthContext } from '../../../contexts/AuthContext';
import { SnackbarProvider } from 'notistack';
import * as assetService from '../../../services/asset.service';
import * as licenseService from '../../../services/software-license.service';
import * as assetCategoryService from '../../../services/asset-category.service';
import * as referenceService from '../../../services/reference.service';

// Mock Services
vi.mock('../../../services/asset.service');
vi.mock('../../../services/software-license.service');
vi.mock('../../../services/asset-category.service');
vi.mock('../../../services/reference.service');

// Mock MUI X-Charts to avoid JSDOM issues
vi.mock('@mui/x-charts/PieChart', () => ({
    PieChart: () => <div data-testid="pie-chart">Chart</div>
}));
vi.mock('@mui/x-charts', () => ({
    PieChart: () => <div data-testid="pie-chart">Chart</div>
}));

// Mock Child Components to reduce noise, but we want to test interaction so we might keep some
// For now, mocking Modal to avoid portal issues in simple page tests
vi.mock('../../../components/modals/AssetModal', () => ({
    default: ({ open, onClose, onSave }) => open ? (
        <div data-testid="asset-modal">
            <button onClick={onClose}>Close</button>
            <button onClick={() => onSave({ name: 'New Asset' })}>Save</button>
        </div>
    ) : null
}));

// Auth & Permission mocks
vi.mock('../../../hooks/useAuth', () => ({ default: () => ({ user: { id: '1', name: 'Test', roles: [{ name: 'Super Admin' }] }, token: 't', hasRole: () => true }) }));

const mockAuth = { hasPermission: () => true };

const renderWithProviders = (ui) => {
    return render(
        <SnackbarProvider>
            <ThemeContext.Provider value={{ mode: 'light' }}>
                <AuthContext.Provider value={mockAuth}>
                    {ui}
                </AuthContext.Provider>
            </ThemeContext.Provider>
        </SnackbarProvider>
    );
};

describe('AssetsPage', () => {
    const mockAssets = [
        { id: 1, name: 'Laptop Dell', code: 'NB-001', status: 'PROPRIO', acquisitionValue: 5000, categoryId: 'cat1', createdAt: new Date().toISOString() },
        { id: 2, name: 'Server HP', code: 'SRV-001', status: 'MANUTENCAO', acquisitionValue: 15000, categoryId: 'cat1', createdAt: new Date().toISOString() },
        { id: 3, name: 'Printer', code: 'PRT-001', status: 'LOCADO', acquisitionValue: 0, categoryId: 'cat2', createdAt: new Date().toISOString() }
    ];

    const mockLicenses = [
        { id: 1, name: 'Office 365', vendor: 'Microsoft', quantity: 10, usedQuantity: 5, cost: 100, licenseType: 'ASSINATURA', expirationDate: '2030-01-01' },
        { id: 2, name: 'Old AntiVirus', vendor: 'McAfee', quantity: 5, usedQuantity: 0, cost: 50, licenseType: 'PERPETUA', expirationDate: '2020-01-01' } // Expired
    ];

    const mockCategories = [
        { id: 'cat1', name: 'Hardware' },
        { id: 'cat2', name: 'Peripherals' }
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        assetService.getAssets.mockResolvedValue(mockAssets);
        licenseService.getLicenses.mockResolvedValue(mockLicenses);
        assetCategoryService.getAssetCategories.mockResolvedValue(mockCategories);
        referenceService.getReferenceUsers.mockResolvedValue([]);
        referenceService.getReferenceSuppliers.mockResolvedValue([]);
        referenceService.getReferenceContracts.mockResolvedValue([]);
        referenceService.getReferenceCostCenters.mockResolvedValue([]);
    });

    it('should render Dashboard KPIs correctly', async () => {
        renderWithProviders(<AssetsPage />);

        await waitFor(() => expect(screen.queryByText(/Gestão de Ativos/i)).toBeInTheDocument());

        // Total Assets
        expect(screen.getByText('Total de Ativos')).toBeInTheDocument();
        // Since mockAssets has 3 items
        expect(screen.getAllByText('3')[0]).toBeInTheDocument();

        // Maintenance
        expect(screen.getByText(/Em Manutenção/i)).toBeInTheDocument();
        // 1 item in maintenance
        expect(screen.getAllByText('1')[0]).toBeInTheDocument();

        // Value: 5000 + 15000 = 20000 — compact pt-BR (ex.: "R$ 20,0 mil"); pode repetir no dashboard
        expect(screen.getAllByText(/R\$\s*20[,.]?\d*\s*mil/i)[0]).toBeInTheDocument();
    });

    it(
        'should switch to List view and filter assets',
        async () => {
            renderWithProviders(<AssetsPage />);
            await waitFor(() => expect(screen.queryByText(/Gestão de Ativos/i)).toBeInTheDocument());

            // Switch to List
            const listBtn = screen.getByRole('button', { name: /Hardware/i }); // The button text in View Toggle
            fireEvent.click(listBtn);

            expect(await screen.findByText('Lista de Ativos', {}, { timeout: 15000 })).toBeInTheDocument();
            expect(screen.getByText('Laptop Dell')).toBeInTheDocument();
            expect(screen.getByText('Printer')).toBeInTheDocument();

            fireEvent.click(screen.getByRole('button', { name: /^Filtros$/i }));
            const searchInput = await screen.findByPlaceholderText('Buscar por codigo ou nome...');
            fireEvent.change(searchInput, { target: { value: 'Laptop' } });
            fireEvent.click(screen.getByRole('button', { name: /Aplicar/i }));

            await waitFor(
                () => {
                    expect(screen.getByText('Laptop Dell')).toBeInTheDocument();
                    expect(screen.queryByText('Printer')).not.toBeInTheDocument();
                },
                { timeout: 10000 }
            );
        },
        20000
    );

    it('should calculate license KPIs (Expired/Expiring)', async () => {
        renderWithProviders(<AssetsPage />);
        await waitFor(() => expect(screen.queryByText(/Gestão de Ativos/i)).toBeInTheDocument());

        // We are on Dashboard by default. Check License KPIs there.
        // Total Licenses in KPIs: 10 + 5 = 15
        expect(screen.getByText(/Total de Licenças/i)).toBeInTheDocument();
        expect(screen.getAllByText('2')[0]).toBeInTheDocument(); // 10 + 5 from mockLicenses

        // Check charts rendered (Text labels in pie chart legend or side info)
        expect(screen.getByText(/Assinatura/i)).toBeInTheDocument();
        expect(screen.getByText(/Perpétua/i)).toBeInTheDocument();
    });

    it('should open New Asset modal', async () => {
        renderWithProviders(<AssetsPage />);
        // Wait for load
        await waitFor(() => expect(screen.queryByText(/Gestão de Ativos/i)).toBeInTheDocument());

        const newBtn = screen.getByTestId('btn-novo-ativo');
        fireEvent.click(newBtn);

        expect(await screen.findByTestId('asset-modal')).toBeInTheDocument();
    });
});
