import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TasksPage from '../TasksPage';
import { ThemeContext } from '../../../contexts/ThemeContext';
import { SnackbarProvider } from 'notistack';
import * as taskService from '../../../services/task.service';
import * as referenceService from '../../../services/reference.service';

// Mock Services
vi.mock('../../../services/task.service');
vi.mock('../../../services/reference.service');

// Mock Subcomponents
vi.mock('../../../components/tasks/TaskKanban', () => ({
    default: ({ tasks }) => <div data-testid="kanban-view">Kanban Items: {tasks.length}</div>
}));
vi.mock('../../../components/tasks/DarkTaskKanban', () => ({
    default: ({ tasks }) => <div data-testid="kanban-view-dark">Dark Kanban Items: {tasks.length}</div>
}));
vi.mock('../../../components/tasks/TaskList', () => ({
    default: ({ tasks }) => <div data-testid="list-view">List Items: {tasks.length}</div>
}));
vi.mock('../../../components/tasks/DarkTaskList', () => ({
    default: ({ tasks }) => <div data-testid="list-view-dark">Dark List Items: {tasks.length}</div>
}));
vi.mock('../../../components/modals/TaskModal', () => ({
    default: ({ open, onClose }) => open ? <div data-testid="task-modal"><button onClick={onClose}>Close</button></div> : null
}));

// Auth & Permission mocks
vi.mock('../../../hooks/useAuth', () => ({ default: () => ({ user: { id: '1', name: 'Test', roles: [{ name: 'Super Admin' }] }, token: 't', hasRole: () => true }) }));

// Mock Task Timer Context
vi.mock('../../../contexts/TaskTimerContext', () => ({
    useTaskTimerContext: () => ({ activeTimer: null, isRunning: false, start: vi.fn(), stop: vi.fn() }),
    TaskTimerProvider: ({ children }) => <>{children}</>
}));

const renderWithProviders = (ui, themeMode = 'light') => {
    return render(
        <SnackbarProvider>
            <ThemeContext.Provider value={{ mode: themeMode }}>
                {ui}
            </ThemeContext.Provider>
        </SnackbarProvider>
    );
};

describe('TasksPage', () => {
    const mockTasks = [
        { id: 1, title: 'Fix Bug', status: 'TODO', priority: 'HIGH', assignee: { id: 1, name: 'John' } },
        { id: 2, title: 'Write Docs', status: 'DONE', priority: 'LOW', assignee: { id: 2, name: 'Jane' } }
    ];
    const mockUsers = [
        { id: 1, name: 'John' },
        { id: 2, name: 'Jane' }
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        taskService.getGeneralTasks.mockResolvedValue(mockTasks);
        referenceService.getReferenceUsers.mockResolvedValue(mockUsers);
    });

    it('should render KPIs based on tasks', async () => {
        renderWithProviders(<TasksPage />);
        await waitFor(() => expect(screen.getByText('Tarefas Gerais')).toBeInTheDocument());

        // Total: 2
        // TODO: 1
        // Done: 1
        // We look for the values rendered in KPI cards
        expect(screen.getByText('2')).toBeInTheDocument(); // Total
        const ones = screen.getAllByText('1');
        expect(ones.length).toBeGreaterThanOrEqual(2); // One for TODO, One for DONE
    });

    it('should filter tasks by status', async () => {
        renderWithProviders(<TasksPage />);
        await waitFor(() => expect(screen.getByText('Tarefas Gerais')).toBeInTheDocument());

        // Initial Kanban view (light mode)
        expect(screen.getByTestId('kanban-view')).toHaveTextContent('Kanban Items: 2');

        // Filter by Status "DONE"
        // Find the status select. It's the first select in the filters area.
        // We can use getAllByRole('combobox') or querySelector. Use container querySelector for safety like we learned.

        // Wait, looking at code: InputLabel is "Status".
        // Let's rely on firing event on the hidden input or finding the select if it's native.
        // The code uses `TextField select` which renders a MUI Select.
        // Unlike native select, MUI select is harder to test with fireEvent.change on the visible element.
        // We use `mouseDown` on the select button then `click` on the option.

        // However, standard testing library approach:
        const statusSelect = screen.getByLabelText(/Status/i);
        fireEvent.mouseDown(statusSelect);
        const option = await screen.findByRole('option', { name: 'Concluído' });
        fireEvent.click(option);

        // Expect filtered count
        expect(screen.getByTestId('kanban-view')).toHaveTextContent('Kanban Items: 1');
    });

    it('should switch between Kanban and List views', async () => {
        renderWithProviders(<TasksPage />);
        await waitFor(() => expect(screen.getByText('Tarefas Gerais')).toBeInTheDocument());

        // To List
        const listBtn = screen.getByText('Lista');
        fireEvent.click(listBtn);

        expect(screen.getByTestId('list-view')).toBeInTheDocument();
        expect(screen.queryByTestId('kanban-view')).not.toBeInTheDocument();

        // Back to Kanban
        const kanbanBtn = screen.getByText('Kanban');
        fireEvent.click(kanbanBtn);

        expect(screen.getByTestId('kanban-view')).toBeInTheDocument();
    });

    it('should open new task modal', async () => {
        renderWithProviders(<TasksPage />);
        await waitFor(() => expect(screen.getByText('Tarefas Gerais')).toBeInTheDocument());

        const newBtn = screen.getByTestId('btn-nova-tarefa');
        fireEvent.click(newBtn);

        expect(await screen.findByTestId('task-modal')).toBeInTheDocument();
    });
});
