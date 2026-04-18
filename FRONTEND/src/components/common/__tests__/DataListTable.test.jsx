import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import DataListTable from '../DataListTable';
import { ThemeContext } from '../../../contexts/ThemeContext';

const renderWithTheme = (ui) =>
  render(<ThemeContext.Provider value={{ mode: 'light' }}>{ui}</ThemeContext.Provider>);

describe('DataListTable', () => {
  it('renderiza título do shell e linhas paginadas', () => {
    const rows = Array.from({ length: 12 }, (_, i) => ({
      id: `r${i}`,
      name: `Item ${i}`,
    }));
    renderWithTheme(
      <DataListTable
        shell={{ title: 'Lista teste', count: 12 }}
        columns={[{ id: 'name', label: 'Nome', render: (r) => r.name }]}
        rows={rows}
        rowsPerPageDefault={10}
      />
    );
    expect(screen.getByText('Lista teste')).toBeInTheDocument();
    expect(screen.getByText('Item 0')).toBeInTheDocument();
    expect(screen.getByText('Item 9')).toBeInTheDocument();
    expect(screen.queryByText('Item 10')).not.toBeInTheDocument();
  });

  it('mostra mensagem vazia quando não há linhas', () => {
    renderWithTheme(
      <DataListTable
        shell={{ title: 'Vazio' }}
        columns={[{ id: 'x', label: 'X', render: () => '-' }]}
        rows={[]}
        emptyMessage="Nada aqui"
      />
    );
    expect(screen.getByText('Nada aqui')).toBeInTheDocument();
  });

  it('usa emptyContent em vez de emptyMessage quando definido', () => {
    renderWithTheme(
      <DataListTable
        shell={{ title: 'Fila' }}
        columns={[{ id: 'x', label: 'X', render: () => '-' }]}
        rows={[]}
        emptyMessage="Mensagem curta"
        emptyContent={<div data-testid="rich-empty">Vazio rico com CTA</div>}
      />
    );
    expect(screen.getByTestId('rich-empty')).toBeInTheDocument();
    expect(screen.queryByText('Mensagem curta')).not.toBeInTheDocument();
  });
});
