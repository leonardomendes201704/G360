import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { ThemeContext } from '../../../contexts/ThemeContext';
import StandardModal from '../StandardModal';

const muiTheme = createTheme();
const wrap = (ui, mode = 'light') => (
    <ThemeContext.Provider value={{ mode, toggleTheme: vi.fn() }}>
        <ThemeProvider theme={muiTheme}>{ui}</ThemeProvider>
    </ThemeContext.Provider>
);

describe('StandardModal', () => {
    it('renders title and children when open', () => {
        render(
            wrap(
                <StandardModal open title="Título teste" onClose={vi.fn()}>
                    <p>Conteúdo do corpo</p>
                </StandardModal>
            )
        );
        expect(screen.getByRole('heading', { name: /título teste/i })).toBeInTheDocument();
        expect(screen.getByText('Conteúdo do corpo')).toBeInTheDocument();
    });

    it('renders icon when provided', () => {
        render(
            wrap(
                <StandardModal open title="Com ícone" icon="settings" onClose={vi.fn()}>
                    Body
                </StandardModal>
            )
        );
        expect(document.querySelector('.material-icons-round')?.textContent).toContain('settings');
    });

    it('calls onClose when close button is clicked', () => {
        const onClose = vi.fn();
        render(
            wrap(
                <StandardModal open title="X" onClose={onClose}>
                    B
                </StandardModal>
            )
        );
        fireEvent.click(screen.getByRole('button', { name: /fechar/i }));
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('renders actions and calls onClick', () => {
        const a = vi.fn();
        const b = vi.fn();
        render(
            wrap(
                <StandardModal
                    open
                    title="Ações"
                    onClose={vi.fn()}
                    actions={[
                        { label: 'Primeiro', onClick: a },
                        { label: 'Segundo', onClick: b },
                    ]}
                >
                    C
                </StandardModal>
            )
        );
        fireEvent.click(screen.getByRole('button', { name: /primeiro/i }));
        fireEvent.click(screen.getByRole('button', { name: /segundo/i }));
        expect(a).toHaveBeenCalledTimes(1);
        expect(b).toHaveBeenCalledTimes(1);
    });

    it('prefers custom footer over actions', () => {
        const actionSpy = vi.fn();
        render(
            wrap(
                <StandardModal
                    open
                    title="F"
                    onClose={vi.fn()}
                    actions={[{ label: 'Não deve aparecer', onClick: actionSpy }]}
                    footer={<button type="button">Custom ok</button>}
                >
                    x
                </StandardModal>
            )
        );
        expect(screen.getByRole('button', { name: /custom ok/i })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /não deve aparecer/i })).not.toBeInTheDocument();
    });

    it('does not render dialog content when closed', () => {
        render(
            wrap(
                <StandardModal open={false} title="Oculto" onClose={vi.fn()}>
                    Nada
                </StandardModal>
            )
        );
        expect(screen.queryByRole('heading', { name: /oculto/i })).not.toBeInTheDocument();
    });
});
