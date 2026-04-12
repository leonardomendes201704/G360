import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AssetModal from '../AssetModal';
import { SnackbarProvider } from 'notistack';
import * as referenceService from '../../../services/reference.service';

// Mock Services
vi.mock('../../../services/reference.service');
vi.mock('../../../services/asset-category.service', () => ({
    getAssetCategories: vi.fn().mockResolvedValue([{ id: 'cat1', name: 'Laptops' }]),
    createAssetCategory: vi.fn()
}));

vi.mock('../../common/InlineCreateSelect', () => ({
    default: ({ value, onChange, options, helperText }) => (
        <div>
            <select data-testid="mock-category-select" value={value || ''} onChange={(e) => onChange(e.target.value)}>
                <option value="">Select Category</option>
                {options?.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
            {helperText && <span>{helperText}</span>}
        </div>
    )
}));

const renderWithProviders = (ui) => {
    return render(
        <SnackbarProvider>
            {ui}
        </SnackbarProvider>
    );
};

describe('AssetModal', () => {
    const mockOnSave = vi.fn();
    const mockOnClose = vi.fn();

    const mockSuppliers = [{ id: 'sup1', name: 'Supplier A' }];
    const mockContracts = [{ id: 'con1', number: 'CTR-001', description: 'Leasing Dell' }];
    const mockCostCenters = [{ id: 'cc1', code: 'IT-001' }];

    beforeEach(() => {
        vi.clearAllMocks();
        referenceService.getReferenceSuppliers.mockResolvedValue(mockSuppliers);
        referenceService.getReferenceContracts.mockResolvedValue(mockContracts);
        referenceService.getReferenceCostCenters.mockResolvedValue(mockCostCenters);
    });

    it('should validate required fields for Hardware', async () => {
        renderWithProviders(<AssetModal open={true} onClose={mockOnClose} onSave={mockOnSave} />);

        const saveBtn = screen.getByText('Salvar Ativo');
        fireEvent.click(saveBtn);

        // Required fields: Code, Name, Category, Status
        expect(await screen.findByText('Código/Patrimônio é obrigatório')).toBeInTheDocument();
        expect(screen.getByText('Nome do ativo é obrigatório')).toBeInTheDocument();
        expect(screen.getByText('Categoria é obrigatória')).toBeInTheDocument();
    });



    it('should switch schema to License and validate', async () => {
        renderWithProviders(<AssetModal open={true} onClose={mockOnClose} onSave={mockOnSave} />);

        // Switch to License
        const licenseTypeBtn = screen.getByText('Licença de Software'); // Button text
        fireEvent.click(licenseTypeBtn);

        const saveBtn = screen.getByText('Salvar Licença');
        fireEvent.click(saveBtn);

        // Required License fields
        expect(await screen.findByText('Nome do software é obrigatório')).toBeInTheDocument();
        expect(screen.getByText('Fabricante é obrigatório')).toBeInTheDocument();

        // Does NOT show hardware errors
        expect(screen.queryByText('Código/Patrimônio é obrigatório')).not.toBeInTheDocument();
    });
});
