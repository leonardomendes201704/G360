import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ProblemManagement from '../ProblemManagement';
import problemService from '../../../services/problem.service';
import { ThemeProvider, createTheme } from '@mui/material';

// Mock the API calls
vi.mock('../../../services/problem.service', () => ({
    default: {
        getAll: vi.fn(),
        create: vi.fn(),
        updateStatus: vi.fn(),
        linkIncident: vi.fn(),
        getById: vi.fn()
    }
}));

const renderWithTheme = (ui) => {
    return render(
        <ThemeProvider theme={createTheme()}>
            {ui}
        </ThemeProvider>
    );
};

describe('ProblemManagement Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Default Mock Data
        problemService.getAll.mockResolvedValue([
            {
                id: 'p1', code: 'PRB-2025-0001', title: 'Network Down', 
                status: 'INVESTIGATING', rootCause: null, workaround: null,
                incidents: [], requester: { name: 'Admin' }
            }
        ]);
        window.confirm = vi.fn().mockReturnValue(true); // Mock browser confirm
    });

    it('renders the problems table with data from the API', async () => {
        renderWithTheme(<ProblemManagement />);
        
        // Check header
        expect(screen.getByText('Gestão de Problemas (ITIL)')).toBeInTheDocument();

        // Wait for data to load
        await waitFor(() => {
            expect(screen.getByText('PRB-2025-0001')).toBeInTheDocument();
            expect(screen.getByText('Network Down')).toBeInTheDocument();
            expect(screen.getByText('INVESTIGATING')).toBeInTheDocument();
        });
    });

    it('opens the create problem modal and calls the create API', async () => {
        problemService.create.mockResolvedValue({});
        
        renderWithTheme(<ProblemManagement />);
        
        // Open Modal
        const createBtn = screen.getByText('Declarar Problema');
        fireEvent.click(createBtn);

        await waitFor(() => {
            expect(screen.getByText('Declarar Novo Problema Crônico')).toBeInTheDocument();
        });

        // Fill form
        const titleInput = screen.getByLabelText(/Título Resumido/i);
        fireEvent.change(titleInput, { target: { value: 'New Test Problem' } });

        const descInput = screen.getByLabelText(/Descrição Evidência/i);
        fireEvent.change(descInput, { target: { value: 'This is a test desc' } });

        // Submit
        const submitBtn = screen.getByRole('button', { name: 'Declarar' });
        fireEvent.click(submitBtn);

        await waitFor(() => {
            expect(problemService.create).toHaveBeenCalledWith(expect.objectContaining({
                title: 'New Test Problem',
                description: 'This is a test desc'
            }));
            // Data is refetched
            expect(problemService.getAll).toHaveBeenCalledTimes(2);
        });
    });

    it('opens the management modal, handles status update', async () => {
        problemService.updateStatus.mockResolvedValue({});
        
        renderWithTheme(<ProblemManagement />);

        // Wait for list
        await waitFor(() => {
            expect(screen.getByText('PRB-2025-0001')).toBeInTheDocument();
        });

        // Click Edit/Manage
        // The edit button has an EditIcon and is the only button per row right now
        const editButtons = screen.getAllByRole('button');
        // The last button in the row is the edit button (first is 'Declarar Problema')
        fireEvent.click(editButtons[1]);

        await waitFor(() => {
            expect(screen.getByText(/Mission Control.*PRB-2025-0001/i)).toBeInTheDocument();
        });

        // Update RCA
        const rcaInput = screen.getByLabelText(/Causa Raiz/i);
        fireEvent.change(rcaInput, { target: { value: 'Router Failure' } });

        const saveChangesBtn = screen.getByText('Salvar Alterações do Problema');
        fireEvent.click(saveChangesBtn);

        await waitFor(() => {
            expect(problemService.updateStatus).toHaveBeenCalledWith('p1', expect.objectContaining({
                rootCause: 'Router Failure'
            }));
        });
    });

    it('can link an incident inside the manage modal', async () => {
        problemService.linkIncident.mockResolvedValue({});
        problemService.getById.mockResolvedValue({
            id: 'p1', code: 'PRB-2025-0001', title: 'Network Down', 
            status: 'INVESTIGATING', incidents: [{ id: 'inc1', code: 'INC-1', title: 'Test Inc', status: 'OPEN' }]
        });
        
        // Mock alert
        window.alert = vi.fn();

        renderWithTheme(<ProblemManagement />);

        await waitFor(() => expect(screen.getByText('PRB-2025-0001')).toBeInTheDocument());
        const editButtons = screen.getAllByRole('button');
        fireEvent.click(editButtons[1]);

        await waitFor(() => expect(screen.getByText(/Mission Control.*PRB-2025-0001/i)).toBeInTheDocument());

        const uuidInput = screen.getByPlaceholderText(/Ex: ID UUID\.\.\./i);
        fireEvent.change(uuidInput, { target: { value: 'test-uuid-123' } });

        // Link button (has a LinkIcon) The only button near the field. It's the first button without text in the dialog
        const linkBtn = screen.getByTestId('LinkIcon').closest('button');
        fireEvent.click(linkBtn);

        await waitFor(() => {
            expect(problemService.linkIncident).toHaveBeenCalledWith('p1', 'test-uuid-123');
            expect(window.alert).toHaveBeenCalledWith('Incidente vinculado com sucesso!');
        });
    });
});
