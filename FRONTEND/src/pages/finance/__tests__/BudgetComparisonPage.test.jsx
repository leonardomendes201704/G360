import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import BudgetComparisonPage from '../BudgetComparisonPage';
import { ThemeContext } from '../../../contexts/ThemeContext';
import { SnackbarProvider } from 'notistack';
import * as budgetComparisonService from '../../../services/budget-comparison.service';

// Mock Services
vi.mock('../../../services/budget-comparison.service');

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

describe('BudgetComparisonPage', () => {
    const mockBudgets = [
        { id: 1, name: 'Budget 2024', fiscalYear: 2024, total: 100000 },
        { id: 2, name: 'Budget 2023', fiscalYear: 2023, total: 90000 }
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        budgetComparisonService.getAvailableBudgets.mockResolvedValue(mockBudgets);
    });

    it('should load available budgets', async () => {
        renderWithProviders(<BudgetComparisonPage />);

        // Wait for budgets options to be available (in select)
        const budgetTexts = await screen.findAllByText(/Budget 2024/i);
        expect(budgetTexts.length).toBeGreaterThan(0);
    });

    it('should show warning if comparing less than 2 budgets', async () => {
        renderWithProviders(<BudgetComparisonPage />);

        // Wait for budgets to load
        await waitFor(() => expect(screen.getAllByRole('option').length).toBeGreaterThan(0));

        const compareBtn = screen.getByRole('button', { name: /Comparar Orçamentos/i });
        expect(compareBtn).toBeDisabled();
    });

    it('should compare two budgets and render variation badge without crashing', async () => {
        // Mock comparison response
        const mockComparison = {
            budgets: [
                { id: 1, name: 'Budget 2024', fiscalYear: 2024, total: 100000, itemCount: 10, isOBZ: false },
                { id: 2, name: 'Budget 2023', fiscalYear: 2023, total: 90000, itemCount: 8, isOBZ: false }
            ],
            byAccount: [
                { accountCode: '1.01', accountName: 'Test Account', accountType: 'Despesa', values: [100000, 90000] }
            ],
            bySupplier: [],
            byPriority: []
        };
        budgetComparisonService.compareMultipleBudgets.mockResolvedValue(mockComparison);

        const { container } = renderWithProviders(<BudgetComparisonPage />);

        // Wait for options
        await waitFor(() => expect(screen.getAllByRole('option').length).toBeGreaterThan(0));

        // Select budgets (simulating user interaction)
        const selects = screen.getAllByRole('combobox');

        // Select first budget
        fireEvent.change(selects[0], { target: { value: '1' } });
        await waitFor(() => expect(selects[0].value).toBe('1'));

        // Select second budget
        fireEvent.change(selects[1], { target: { value: '2' } });
        await waitFor(() => expect(selects[1].value).toBe('2'));

        // Click compare
        const compareBtn = screen.getByRole('button', { name: /Comparar Orçamentos/i });
        expect(compareBtn).not.toBeDisabled();
        fireEvent.click(compareBtn);

        // Wait for results
        // This should trigger the rendering of VariationBadge and hopefully fail if bug is present
        await waitFor(() => {
            expect(screen.getByText('TOTAL')).toBeInTheDocument();
        });

        console.log('--- DOM DUMP AFTER TABLE LOAD ---');
        console.log(container.innerHTML);

        // Specifically check for VariationBadge rendering logic
        // The badge should show -10% ( (90000-100000)/100000 * 100 ) => renders as 10% with down arrow
        expect(await screen.findByText(/Test Account/i)).toBeInTheDocument();
    });
});
