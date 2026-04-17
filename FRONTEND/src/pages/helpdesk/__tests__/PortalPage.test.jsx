import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import PortalPage from '../PortalPage';
import { ThemeProvider, createTheme } from '@mui/material';

import ticketService from '../../../services/ticket.service';
import serviceCatalogService from '../../../services/service-catalog.service';
import { getAssets } from '../../../services/asset.service';
import KnowledgeBaseService from '../../../services/knowledge-base.service';
import { getActiveSupportGroups } from '../../../services/support-group.service';

vi.mock('../../../services/ticket.service', () => ({ default: { getAll: vi.fn(), create: vi.fn() } }));
vi.mock('../../../services/service-catalog.service', () => ({ default: { getAll: vi.fn(), getCategories: vi.fn() } }));
vi.mock('../../../services/asset.service', () => ({ getAssets: vi.fn() }));
vi.mock('../../../services/knowledge-base.service', () => ({ default: { findAll: vi.fn() } }));
vi.mock('../../../services/support-group.service', () => ({ getActiveSupportGroups: vi.fn() }));

const renderWithThemeAndRouter = (ui) => {
    return render(
        <ThemeProvider theme={createTheme()}>
            <MemoryRouter>
                {ui}
            </MemoryRouter>
        </ThemeProvider>
    );
};

const openWizardAndPickItSoftwareRequest = async () => {
    fireEvent.click(screen.getByRole('button', { name: /Novo ticket/i }));
    await waitFor(() => {
        expect(screen.getByText('Novo chamado')).toBeInTheDocument();
    });
    const itCard = screen.getByRole('button', { name: /Categoria IT/i });
    fireEvent.click(itCard);
    await waitFor(() => {
        expect(screen.getByText('Software Request')).toBeInTheDocument();
    });
    const svcBtn = screen.getByRole('button', { name: /Serviço Software Request/i });
    fireEvent.click(svcBtn);
};

describe('PortalPage Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        ticketService.getAll.mockResolvedValue([
            { id: 't1', code: 'INC-100', title: 'Printer broken', service: { name: 'Hardware Support' }, createdAt: new Date().toISOString(), status: 'OPEN' }
        ]);

        serviceCatalogService.getAll.mockResolvedValue([
            {
                id: 's1',
                name: 'Software Request',
                description: 'Pedido de software',
                category: { name: 'IT' },
                formSchema: '[{"id": "reason", "label": "Motivo", "type": "text", "required": true}]',
                categoryId: 'c1'
            },
            {
                id: 's2',
                name: 'Access Request',
                description: 'Acesso a sistemas',
                category: { name: 'Security' },
                formSchema: null,
                categoryId: 'c2'
            }
        ]);

        serviceCatalogService.getCategories.mockResolvedValue([
            { id: 'c1', name: 'IT' },
            { id: 'c2', name: 'Security' }
        ]);
        getAssets.mockResolvedValue([{ id: 'a1', code: 'AST-01', name: 'MacBook' }]);
        KnowledgeBaseService.findAll.mockResolvedValue([]);
        getActiveSupportGroups.mockResolvedValue([]);
    });

    it('renders hero, Novo ticket and ticket table after loading', async () => {
        renderWithThemeAndRouter(<PortalPage />);

        await waitFor(() => {
            expect(screen.getByText('Olá, como podemos ajudar?')).toBeInTheDocument();
        });

        expect(screen.getByRole('button', { name: /Novo ticket/i })).toBeInTheDocument();
        expect(screen.queryByText('Software Request')).not.toBeInTheDocument();

        expect(screen.getByText('INC-100')).toBeInTheDocument();
        expect(screen.getByText('Printer broken')).toBeInTheDocument();
        expect(screen.getByText('Aberto')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /Ver chamado/i })).toBeInTheDocument();
    });

    it('filters services in the wizard using the search field', async () => {
        renderWithThemeAndRouter(<PortalPage />);
        await waitFor(() => expect(screen.getByRole('button', { name: /Novo ticket/i })).toBeInTheDocument());

        fireEvent.click(screen.getByRole('button', { name: /Novo ticket/i }));
        await waitFor(() => expect(screen.getByText('Novo chamado')).toBeInTheDocument());

        fireEvent.click(screen.getByRole('button', { name: /Categoria Security/i }));
        await waitFor(() => expect(screen.getByText('Access Request')).toBeInTheDocument());

        const searchInput = screen.getByPlaceholderText(/Buscar serviço/i);
        fireEvent.change(searchInput, { target: { value: 'nada' } });

        await waitFor(() => {
            expect(screen.queryByText('Access Request')).not.toBeInTheDocument();
        });
    });

    it('opens ticket modal from wizard and submits with custom answers', async () => {
        window.alert = vi.fn();
        ticketService.create.mockResolvedValue({});

        renderWithThemeAndRouter(<PortalPage />);
        await waitFor(() => expect(screen.getByRole('button', { name: /Novo ticket/i })).toBeInTheDocument());

        await openWizardAndPickItSoftwareRequest();

        await waitFor(() => {
            expect(screen.getByText('Solicitar: Software Request')).toBeInTheDocument();
        });

        const reasonInput = screen.getByLabelText(/Motivo/i);
        fireEvent.change(reasonInput, { target: { value: 'Need IDE' } });

        const descInput = screen.getByLabelText(/Descreva os detalhes/i);
        fireEvent.change(descInput, { target: { value: 'Installing VSCode' } });

        const submitBtn = screen.getByRole('button', { name: /Abrir Chamado/i });
        fireEvent.click(submitBtn);

        await waitFor(() => {
            expect(ticketService.create).toHaveBeenCalledWith(expect.objectContaining({
                title: 'Solicitação: Software Request',
                description: 'Installing VSCode',
                serviceId: 's1',
                categoryId: 'c1',
                customAnswers: { reason: 'Need IDE' }
            }));
            expect(ticketService.getAll).toHaveBeenCalledTimes(2);
        });
    });

    it('prevents submission if required custom fields are empty', async () => {
        window.alert = vi.fn();

        renderWithThemeAndRouter(<PortalPage />);
        await waitFor(() => expect(screen.getByRole('button', { name: /Novo ticket/i })).toBeInTheDocument());

        await openWizardAndPickItSoftwareRequest();

        await waitFor(() => expect(screen.getByText('Solicitar: Software Request')).toBeInTheDocument());

        const descInput = screen.getByLabelText(/Descreva os detalhes/i);
        fireEvent.change(descInput, { target: { value: 'Just failing' } });

        const submitBtn = screen.getByRole('button', { name: /Abrir Chamado/i });
        fireEvent.click(submitBtn);

        await waitFor(() => {
            expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('obrigatório preencher'));
            expect(ticketService.create).not.toHaveBeenCalled();
        });
    });
});
