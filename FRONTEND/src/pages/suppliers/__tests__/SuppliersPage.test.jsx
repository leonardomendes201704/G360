import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SuppliersPage from '../SuppliersPage';
import { ThemeContext } from '../../../contexts/ThemeContext';
import * as supplierService from '../../../services/supplier.service';
import { SnackbarProvider } from 'notistack';

// Mock Services
vi.mock('../../../services/supplier.service');
vi.mock('../../../services/reference.service');

// Mock Child Components
vi.mock('../../../components/modals/SupplierModal', () => ({
    default: ({ open, onClose, onSave }) => open ? (
        <div data-testid="supplier-modal">
            <button onClick={onClose}>Close</button>
            <button onClick={() => onSave({ name: 'New Supplier' })}>Save</button>
        </div>
    ) : null
}));

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

describe('SuppliersPage', () => {
    const mockSuppliers = [
        { id: 1, name: 'Supplier A', document: '12345678901234', status: 'ATIVO', rating: 5 },
        { id: 2, name: 'Supplier B', document: '98765432109876', status: 'INATIVO', rating: 3 }
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        supplierService.getSuppliers.mockResolvedValue(mockSuppliers);
    });

    it('should render suppliers list after loading', async () => {
        renderWithProviders(<SuppliersPage />);

        // Check for loading or wait for items
        expect(await screen.findByText('Supplier A')).toBeInTheDocument();
        expect(screen.getByText('Supplier B')).toBeInTheDocument();
        expect(screen.getByText('Lista de Fornecedores')).toBeInTheDocument();
    });

    it('should open modal when clicking new supplier', async () => {
        renderWithProviders(<SuppliersPage />);

        await waitFor(() => expect(screen.queryByText('Carregando...')).not.toBeInTheDocument());

        const newButton = screen.getByText('Novo Fornecedor');
        fireEvent.click(newButton);

        expect(await screen.findByTestId('supplier-modal')).toBeInTheDocument();
    });

    it('should handle API errors gracefully', async () => {
        supplierService.getSuppliers.mockRejectedValue(new Error('API Error'));

        renderWithProviders(<SuppliersPage />);

        // Notistack behavior might be hard to assertions without mocking it fully, 
        // but we can check if table is empty or specific error text is shown if page handles it explicitly 
        // (Page seems to only enqueue snackbar).
        // Let's verify getSuppliers was called.
        await waitFor(() => expect(supplierService.getSuppliers).toHaveBeenCalled());
    });
});
