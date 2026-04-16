import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import StatsCard from './StatsCard';

const theme = createTheme();

function renderStatsCard() {
    return render(
        <ThemeProvider theme={theme}>
            <StatsCard title="Incidentes Abertos" value={0} subtitle="SLA OK" iconName="warning" hexColor="#f59e0b" accentBar />
        </ThemeProvider>
    );
}

describe('StatsCard (US-020)', () => {
    it('aplica uma linha no titulo (nowrap + ellipsis)', () => {
        renderStatsCard();
        const title = screen.getByTestId('stats-card-title');
        expect(title).toHaveTextContent('Incidentes Abertos');
        expect(title).toHaveStyle({ whiteSpace: 'nowrap' });
    });
});
