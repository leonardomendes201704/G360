import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import EmptyState from '../EmptyState';
import { ThemeProvider, createTheme } from '@mui/material/styles';

const theme = createTheme();
const wrap = (ui) => <ThemeProvider theme={theme}>{ui}</ThemeProvider>;

describe('EmptyState', () => {
    it('renders default title and description', () => {
        render(wrap(<EmptyState />));
        expect(screen.getByText('Nenhum dado encontrado')).toBeInTheDocument();
        expect(screen.getByText(/ajustar os filtros/i)).toBeInTheDocument();
    });

    it('renders custom title and description', () => {
        render(wrap(<EmptyState title="Sem projetos" description="Crie um novo projeto" />));
        expect(screen.getByText('Sem projetos')).toBeInTheDocument();
        expect(screen.getByText('Crie um novo projeto')).toBeInTheDocument();
    });

    it('renders action button when actionLabel and onAction provided', () => {
        const onAction = vi.fn();
        render(wrap(<EmptyState actionLabel="Criar" onAction={onAction} />));
        const btn = screen.getByRole('button', { name: /criar/i });
        expect(btn).toBeInTheDocument();
        fireEvent.click(btn);
        expect(onAction).toHaveBeenCalledTimes(1);
    });

    it('does not render button when actionLabel missing', () => {
        render(wrap(<EmptyState />));
        expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('renders custom action JSX element', () => {
        render(wrap(<EmptyState action={<span>Custom Action</span>} />));
        expect(screen.getByText('Custom Action')).toBeInTheDocument();
    });
});
