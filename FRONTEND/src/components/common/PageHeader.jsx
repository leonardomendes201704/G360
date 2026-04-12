import React from 'react';
import { Box, Typography, Stack } from '@mui/material';

/**
 * PageHeader Component
 * Padroniza o cabeçalho de todas as páginas do sistema.
 * 
 * @param {string} title - Título principal da página
 * @param {string} subtitle - Subtítulo explicativo
 * @param {ReactNode} action - Elemento de ação (ex: Botão "Novo")
 */
const PageHeader = ({ title, subtitle, action }) => {
    return (
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Box>
                <Typography
                    variant="h4"
                    component="h1"
                    sx={{
                        fontWeight: 700,
                        color: '#1e293b',
                        mb: 1,
                        letterSpacing: '-0.5px'
                    }}
                >
                    {title}
                </Typography>
                {subtitle && (
                    <Typography
                        variant="body1"
                        sx={{
                            color: '#64748b',
                            maxWidth: '800px'
                        }}
                    >
                        {subtitle}
                    </Typography>
                )}
            </Box>
            {action && (
                <Box>
                    {action}
                </Box>
            )}
        </Box>
    );
};

export default PageHeader;
