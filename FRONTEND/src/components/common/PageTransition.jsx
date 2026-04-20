import React from 'react';
import { Box } from '@mui/material';
import { useLocation } from 'react-router-dom';

/**
 * PageTransition — Wraps page content with a smooth fade+slide animation
 * on route changes. Uses CSS animations for performance.
 */
const PageTransition = ({ children }) => {
    const location = useLocation();

    return (
        <Box
            key={location.pathname}
            sx={{
                animation: 'pageEnter 0.35s cubic-bezier(0.4, 0, 0.2, 1) both',
                /* Só opacidade no fim — evita transform no wrapper e corrige ghost do Kanban (dnd-kit). */
                '@keyframes pageEnter': {
                    '0%': {
                        opacity: 0,
                    },
                    '100%': {
                        opacity: 1,
                    },
                },
            }}
        >
            {children}
        </Box>
    );
};

export default PageTransition;
