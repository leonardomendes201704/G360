import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { SnackbarProvider } from 'notistack';

import FinancePage from '../FinancePage';
import { ThemeContext } from '../../../contexts/ThemeContext';
import { AuthContext } from '../../../contexts/AuthContext';

import budgetService from '../../../services/budget.service';
import { getAccounts } from '../../../services/account.service';

vi.mock('../FinanceDashboard', () => ({
  default: function FinanceDashboardMock() {
    return <div data-testid="finance-dashboard-mock">FinanceDashboard</div>;
  }
}));

vi.mock('../ExpensesPage', () => ({
  default: function ExpensesPageMock() {
    return <div data-testid="expenses-mock">ExpensesPage</div>;
  }
}));

vi.mock('../DREPage', () => ({
  default: function DREPageMock() {
    return <div data-testid="dre-mock">DREPage</div>;
  }
}));

vi.mock('../../../components/modals/BudgetModal', () => ({
  default: () => null
}));
vi.mock('../../../components/modals/AccountModal', () => ({
  default: () => null
}));

vi.mock('../../../services/budget.service', () => ({
  default: {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  },
  duplicateBudget: vi.fn()
}));

vi.mock('../../../services/account.service', () => ({
  getAccounts: vi.fn(),
  createAccount: vi.fn(),
  updateAccount: vi.fn(),
  deleteAccount: vi.fn()
}));

const theme = createTheme();

const renderFinancePage = (initialEntries = ['/finance']) =>
  render(
    <MemoryRouter initialEntries={initialEntries}>
      <SnackbarProvider>
        <ThemeProvider theme={theme}>
          <ThemeContext.Provider value={{ mode: 'light', toggleTheme: vi.fn() }}>
            <AuthContext.Provider
              value={{
                user: { id: 'u1' },
                hasPermission: () => true
              }}
            >
              <FinancePage />
            </AuthContext.Provider>
          </ThemeContext.Provider>
        </ThemeProvider>
      </SnackbarProvider>
    </MemoryRouter>
  );

describe('FinancePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    budgetService.getAll.mockResolvedValue([]);
    getAccounts.mockResolvedValue([]);
  });

  it('renderiza cabeçalho e separadores sem erro de JSX', () => {
    renderFinancePage();
    expect(screen.getByText('Gestão Financeira')).toBeInTheDocument();
    expect(screen.getByTestId('tab-0')).toBeInTheDocument();
    expect(screen.getByTestId('tab-1')).toBeInTheDocument();
    expect(screen.getByTestId('tab-2')).toBeInTheDocument();
    expect(screen.getByTestId('tab-3')).toBeInTheDocument();
    expect(screen.getByTestId('tab-4')).toBeInTheDocument();
  });

  it('mostra o dashboard simulado no separador inicial', () => {
    renderFinancePage();
    expect(screen.getByTestId('finance-dashboard-mock')).toBeInTheDocument();
  });

  it('ORC-01: ?tab=budgets abre na aba Orçamentos e carrega lista sem clicar', async () => {
    renderFinancePage(['/finance?tab=budgets']);
    await waitFor(() => {
      expect(budgetService.getAll).toHaveBeenCalled();
    });
    expect(screen.queryByTestId('finance-dashboard-mock')).not.toBeInTheDocument();
    const budgetsTab = screen.getByTestId('budgets-tab-content');
    expect(budgetsTab).toBeInTheDocument();
    expect(within(budgetsTab).getByRole('columnheader', { name: /Nome/i })).toBeInTheDocument();
  });

  it('ORC-01: ?tab=2 é alias para aba Orçamentos', async () => {
    renderFinancePage(['/finance?tab=2']);
    await waitFor(() => {
      expect(budgetService.getAll).toHaveBeenCalled();
    });
    expect(screen.getByTestId('budgets-tab-content')).toBeInTheDocument();
  });

  it('separador Orçamentos: grelha e estado vazio', async () => {
    renderFinancePage();
    fireEvent.click(screen.getByTestId('tab-2'));
    await waitFor(() => {
      expect(budgetService.getAll).toHaveBeenCalled();
    });
    const budgetsTab = screen.getByTestId('budgets-tab-content');
    expect(budgetsTab).toBeInTheDocument();
    expect(within(budgetsTab).getByRole('columnheader', { name: /Nome/i })).toBeInTheDocument();
    expect(within(budgetsTab).getByText(/Nenhum orçamento cadastrado/i)).toBeInTheDocument();
  });

  it('separador Plano de Contas: tabela com cabeçalhos e Paper fechado corretamente', async () => {
    getAccounts.mockResolvedValue([
      {
        id: 'a1',
        code: '1.1',
        name: 'Conta teste',
        type: 'OPEX',
        parent: null
      }
    ]);

    renderFinancePage();
    fireEvent.click(screen.getByTestId('tab-3'));

    await waitFor(() => {
      expect(getAccounts).toHaveBeenCalled();
    });

    expect(screen.getByRole('columnheader', { name: /Código/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Nome/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Tipo/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Hierarquia/i })).toBeInTheDocument();
    expect(screen.getByText('Conta teste')).toBeInTheDocument();
    expect(screen.getByText('1.1')).toBeInTheDocument();
  });

  it('separador DRE: renderiza conteúdo simulado', () => {
    renderFinancePage();
    fireEvent.click(screen.getByTestId('tab-4'));
    expect(screen.getByTestId('dre-mock')).toBeInTheDocument();
  });
});
