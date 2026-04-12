import React from 'react';
import { render, screen } from '@testing-library/react';
import StatusChip from '../StatusChip';
import { getStatusConfig } from '../../../utils/statusUtils';
import { describe, it, expect, vi } from 'vitest';

// Mock statusUtils to control output
vi.mock('../../../utils/statusUtils', () => ({
    getStatusConfig: vi.fn()
}));

describe('StatusChip', () => {
    it('should render with correct label from config', () => {
        getStatusConfig.mockReturnValue({ label: 'Approved', color: 'success' });

        render(<StatusChip status="APPROVED" />);

        expect(screen.getByText('Approved')).toBeInTheDocument();
        expect(getStatusConfig).toHaveBeenCalledWith('APPROVED');
    });

    it('should use custom label if provided', () => {
        getStatusConfig.mockReturnValue({ label: 'Approved', color: 'success' });

        render(<StatusChip status="APPROVED" label="Custom Label" />);

        expect(screen.getByText('Custom Label')).toBeInTheDocument();
    });
});
