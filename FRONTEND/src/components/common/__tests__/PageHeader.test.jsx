import React from 'react';
import { render, screen } from '@testing-library/react';
import PageHeader from '../PageHeader';
import { describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

describe('PageHeader', () => {
    it('should render title and subtitle', () => {
        render(<PageHeader title="My Page" subtitle="My Subtitle" />, { wrapper: MemoryRouter });
        expect(screen.getByText('My Page')).toBeInTheDocument();
        expect(screen.getByText('My Subtitle')).toBeInTheDocument();
    });

    it('should render action button', () => {
        render(
            <PageHeader
                title="Page"
                action={<button onClick={() => { }}>Add New</button>}
            />,
            { wrapper: MemoryRouter }
        );
        expect(screen.getByRole('button', { name: /add new/i })).toBeInTheDocument();
    });
});
