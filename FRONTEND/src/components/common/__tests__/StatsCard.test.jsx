import React from 'react';
import { render, screen } from '@testing-library/react';
import StatsCard from '../StatsCard';
import { describe, it, expect } from 'vitest';

describe('StatsCard', () => {
    it('should render title and value', () => {
        render(<StatsCard title="Total Users" value="1,234" />);
        expect(screen.getByText('Total Users')).toBeInTheDocument();
        expect(screen.getByText('1,234')).toBeInTheDocument();
    });



    it('should render icon if provided', () => {
        // Mocking icon component or passing a string/element
        render(<StatsCard title="Icon" value="1" icon={<span>IconTest</span>} />);
        expect(screen.getByText('IconTest')).toBeInTheDocument();
    });
});
