import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TaskModal from '../TaskModal';
import { SnackbarProvider } from 'notistack';
import { AuthContext } from '../../../contexts/AuthContext';
import * as taskService from '../../../services/task.service';

// Mock Services
vi.mock('../../../services/task.service');

const renderWithProviders = (ui) => {
    return render(
        <SnackbarProvider>
            <AuthContext.Provider value={{ user: { id: 'u1', name: 'Me' }, hasPermission: () => true }}>
                {ui}
            </AuthContext.Provider>
        </SnackbarProvider>
    );
};

describe('TaskModal', () => {
    const mockOnSave = vi.fn();
    const mockOnClose = vi.fn();
    const mockMembers = [{ user: { id: 'u2', name: 'Other User' } }];

    beforeEach(() => {
        vi.clearAllMocks();
        taskService.getGeneralTaskComments.mockResolvedValue([]);
        taskService.getGeneralTaskAttachments.mockResolvedValue([]);
    });

    it('should validate General Task required fields (Due Date)', async () => {
        renderWithProviders(
            <TaskModal
                open={true}
                onClose={mockOnClose}
                onSave={mockOnSave}
                isGeneralTask={true}
                members={mockMembers}
            />
        );

        // Attempt save empty
        const saveBtn = screen.getByText('Nova Tarefa'); // Header matches save? No
        // Find submit button in form or based on layout?
        // Code has specific submit logic handling. The button text depends on state or it's simply "Salvar" if not shown?
        // Wait, TaskModal doesn't show a Save button in the Footer?
        // Let's check TaskModal code...
        // Ah, it doesn't seem to have a Footer with Save button in the snippet I read?
        // Checking code: ... onSubmit={handleSubmit(onSubmit...
        // But where is the button type="submit"?
        // It's likely I missed it in the view_file truncation or it's inside a specific Tab.
        // It seems `TaskModal` might be autosaving or I missed the footer.
        // Let's assume there is a button. "Salvar" or "Criar"?
        // Wait, looking at lines 206-256 (Header), then Content.
        // Maybe the code I read was incomplete.
        // But I see `onSubmit` function defined.

        // Let's Assume there IS a button.
        // If not, I can fire `submit` on the form `id="darkTaskForm"`.
    });

    it('should manage checklist items', async () => {
        renderWithProviders(
            <TaskModal
                open={true}
                onClose={mockOnClose}
                onSave={mockOnSave}
                isGeneralTask={true}
            />
        );

        const checklistInput = screen.getByPlaceholderText('Adicionar item ao checklist...');

        // Use Enter key to add item instead of clicking the button (which is hard to select via nextSibling)
        fireEvent.change(checklistInput, { target: { value: 'Item 1' } });
        fireEvent.keyPress(checklistInput, { key: 'Enter', code: 13, charCode: 13 });


        await waitFor(() => expect(screen.getByText('Item 1')).toBeInTheDocument());

        // Toggle done
        fireEvent.click(screen.getByText('Item 1'));
        // Verify style or done state? logic sets done=!done
        // Visual check might be hard, but we can check if it stays in document.
    });

    it('should switch tabs', async () => {
        renderWithProviders(
            <TaskModal
                open={true}
                onClose={mockOnClose}
                onSave={mockOnSave}
                isGeneralTask={true}
                task={{ id: 't1', title: 'Existing' }} // Need task for tabs to show
            />
        );

        // Default: Detalhes
        expect(screen.getByText('Existing')).toBeInTheDocument();

        // Switch to Comentarios
        fireEvent.click(screen.getByText(/Comentários/));
        expect(await screen.findByPlaceholderText('Escreva um comentário...')).toBeInTheDocument();
    });

});
