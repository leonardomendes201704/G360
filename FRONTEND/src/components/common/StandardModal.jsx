import { Dialog, DialogTitle, DialogContent, DialogActions, Box, Typography, IconButton, Button, CircularProgress } from '@mui/material';
import { useContext } from 'react';
import { ThemeContext } from '../../contexts/ThemeContext';

/**
 * StandardModal — Wrapper padronizado do MUI Dialog.
 *
 * @param {boolean}   open - Controla visibilidade
 * @param {function}  onClose - Handler de fechamento
 * @param {string}    title - Titulo do modal
 * @param {string}    [subtitle] - Subtitulo opcional
 * @param {string}    [icon] - Nome do Material Icon (string)
 * @param {ReactNode} children - Conteudo do corpo
 * @param {Array}     [actions] - Botoes do rodape [{ label, onClick, variant?, color?, disabled? }]
 * @param {string}    [maxWidth='sm'] - Largura maxima ('xs'|'sm'|'md'|'lg'|'xl')
 * @param {boolean}   [loading=false] - Exibe spinner e desabilita acoes
 * @param {boolean}   [fullWidth=true] - Ocupa largura total ate maxWidth
 */
const StandardModal = ({
    open,
    onClose,
    title,
    subtitle,
    icon,
    children,
    actions,
    maxWidth = 'sm',
    loading = false,
    fullWidth = true,
}) => {
    const { mode } = useContext(ThemeContext);

    return (
        <Dialog
            open={open}
            onClose={loading ? undefined : onClose}
            maxWidth={maxWidth}
            fullWidth={fullWidth}
            PaperProps={{
                sx: {
                    borderRadius: '16px',
                    bgcolor: mode === 'dark' ? '#1a222d' : '#ffffff',
                    border: mode === 'dark' ? '1px solid rgba(255,255,255,0.06)' : '1px solid #e2e8f0',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                }
            }}
            BackdropProps={{
                sx: {
                    backdropFilter: 'blur(4px)',
                    bgcolor: 'rgba(0,0,0,0.4)',
                }
            }}
        >
            {/* Header */}
            <DialogTitle
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    p: 2.5,
                    borderBottom: '1px solid',
                    borderColor: mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#f1f5f9',
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    {icon && (
                        <Box sx={{
                            width: 40, height: 40, borderRadius: 2,
                            bgcolor: 'rgba(37, 99, 235, 0.1)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <span className="material-icons-round" style={{ fontSize: 22, color: '#2563eb' }}>{icon}</span>
                        </Box>
                    )}
                    <Box>
                        <Typography sx={{ fontSize: 18, fontWeight: 600 }}>{title}</Typography>
                        {subtitle && (
                            <Typography sx={{ fontSize: 13, color: mode === 'dark' ? '#94a3b8' : '#64748b' }}>
                                {subtitle}
                            </Typography>
                        )}
                    </Box>
                </Box>
                <IconButton onClick={onClose} disabled={loading} size="small">
                    <span className="material-icons-round" style={{ fontSize: 20 }}>close</span>
                </IconButton>
            </DialogTitle>

            {/* Body */}
            <DialogContent sx={{ p: 2.5 }}>
                {children}
            </DialogContent>

            {/* Footer */}
            {actions && actions.length > 0 && (
                <DialogActions
                    sx={{
                        p: 2.5,
                        borderTop: '1px solid',
                        borderColor: mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#f1f5f9',
                        gap: 1,
                    }}
                >
                    {actions.map((action, idx) => (
                        <Button
                            key={idx}
                            onClick={action.onClick}
                            variant={action.variant || (idx === actions.length - 1 ? 'contained' : 'outlined')}
                            color={action.color || 'primary'}
                            disabled={loading || action.disabled}
                            startIcon={loading && idx === actions.length - 1 ? <CircularProgress size={18} color="inherit" /> : null}
                            sx={{
                                borderRadius: 2,
                                textTransform: 'none',
                                fontWeight: 600,
                                ...(idx === actions.length - 1 && !action.color ? {
                                    background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
                                } : {}),
                            }}
                        >
                            {action.label}
                        </Button>
                    ))}
                </DialogActions>
            )}
        </Dialog>
    );
};

export default StandardModal;
