import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ConfirmDialog from '../ConfirmDialog';
import { ThemeProvider, createTheme } from '@mui/material/styles';

const theme = createTheme();
const wrap = (ui) => <ThemeProvider theme={theme}>{ui}</ThemeProvider>;

describe('ConfirmDialog', () => {
    const defaultProps = {
        open: true,
        title: 'Confirm Delete',
        content: 'Are you sure you want to delete?',
        onConfirm: vi.fn(),
        onClose: vi.fn(),
    };

    it('renders title and content when open', () => {
        render(wrap(<ConfirmDialog {...defaultProps} />));
        expect(screen.getByText('Confirm Delete')).toBeInTheDocument();
        expect(screen.getByText('Are you sure you want to delete?')).toBeInTheDocument();
    });

    it('renders default button labels', () => {
        render(wrap(<ConfirmDialog {...defaultProps} />));
        expect(screen.getByRole('button', { name: /confirmar/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /cancelar/i })).toBeInTheDocument();
    });

    it('renders custom button labels', () => {
        render(wrap(<ConfirmDialog {...defaultProps} confirmText="Delete" cancelText="Go Back" />));
        expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /go back/i })).toBeInTheDocument();
    });

    it('calls onConfirm when confirm button clicked', () => {
        const onConfirm = vi.fn();
        render(wrap(<ConfirmDialog {...defaultProps} onConfirm={onConfirm} />));
        fireEvent.click(screen.getByRole('button', { name: /confirmar/i }));
        expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when cancel button clicked', () => {
        const onClose = vi.fn();
        render(wrap(<ConfirmDialog {...defaultProps} onClose={onClose} />));
        fireEvent.click(screen.getByRole('button', { name: /cancelar/i }));
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('does not render when open is false', () => {
        render(wrap(<ConfirmDialog {...defaultProps} open={false} />));
        expect(screen.queryByText('Confirm Delete')).not.toBeInTheDocument();
    });
});
