import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Box,
    Typography,
    IconButton,
    Button,
    CircularProgress,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useContext, useId } from 'react';
import { ThemeContext } from '../../contexts/ThemeContext';

/** Presets de largura para alinhar decisões de layout entre módulos. */
const SIZE_PRESET_TO_MAX_WIDTH = {
    form: 'sm',
    detail: 'md',
    wide: 'lg',
    xl: 'xl',
};

/**
 * Com DialogTitle, o MUI zera padding-top no DialogContent; sem `!important` os labels dos TextField
 * encostam no divisor. `contentSx` com `pt`/`py`/`p` não pode vir depois de um paddingTop fixo sem
 * reaplicar o `!important` — senão a regra do MUI volta a ganhar.
 */
function resolveDialogContentPaddingTop(theme, contentSx) {
    if (!contentSx || typeof contentSx !== 'object') {
        return `${theme.spacing(3)} !important`;
    }
    const { p, pt, py, padding, paddingTop } = contentSx;
    if (p === 0 || padding === 0 || pt === 0 || py === 0 || paddingTop === 0) {
        return '0 !important';
    }
    if (typeof pt === 'number' && pt > 0) {
        return `${theme.spacing(pt)} !important`;
    }
    if (typeof py === 'number' && py > 0) {
        return `${theme.spacing(py)} !important`;
    }
    if (typeof p === 'number' && p > 0) {
        return `${theme.spacing(p)} !important`;
    }
    if (paddingTop != null && paddingTop !== 0) {
        if (typeof paddingTop === 'number') {
            return `${theme.spacing(paddingTop)} !important`;
        }
        const s = String(paddingTop);
        return s.includes('important') ? paddingTop : `${paddingTop} !important`;
    }
    return `${theme.spacing(3)} !important`;
}

/**
 * StandardModal — casca padronizada do MUI Dialog (header + corpo com scroll + footer fixo).
 *
 * @param {boolean}   open
 * @param {function}  onClose
 * @param {string}    title
 * @param {string}    [subtitle]
 * @param {string}    [icon] - nome Material Icons Round
 * @param {ReactNode} children - conteúdo do corpo (área com scroll)
 * @param {Array}     [actions] - botões do rodapé [{ label, onClick, variant?, color?, disabled?, type? }] (ignorado se `footer` for passado)
 * @param {ReactNode} [footer] - rodapé customizado (substitui `actions`; use `DialogActions` não é necessário — o wrapper aplica borda e padding)
 * @param {string}    [maxWidth] - 'xs' | 'sm' | 'md' | 'lg' | 'xl' (default 'sm'); se omitido e `size` existir, usa o preset
 * @param {'form'|'detail'|'wide'|'xl'} [size] - atalho para maxWidth (form→sm, detail→md, wide→lg)
 * @param {boolean}   [loading=false] - bloqueia fecho e ações; no modo `actions`, último botão mostra spinner
 * @param {boolean}   [fullWidth=true]
 * @param {object}    [contentSx] - sx extra no DialogContent (corpo scrollável)
 * @param {object}    [paperProps] - props extra no Paper do Dialog (ex.: `data-testid`)
 */
const StandardModal = ({
    open,
    onClose,
    title,
    subtitle,
    icon,
    children,
    actions,
    footer,
    maxWidth,
    size,
    loading = false,
    fullWidth = true,
    contentSx,
    paperProps,
}) => {
    const { mode } = useContext(ThemeContext);
    const theme = useTheme();
    const reactId = useId();
    const titleId = `g360-modal-title-${reactId.replace(/:/g, '')}`;

    const resolvedMaxWidth =
        maxWidth ??
        (size && SIZE_PRESET_TO_MAX_WIDTH[size] ? SIZE_PRESET_TO_MAX_WIDTH[size] : null) ??
        'sm';

    const paperSx = {
        borderRadius: '8px',
        bgcolor: mode === 'dark' ? '#1a222d' : '#ffffff',
        border: mode === 'dark' ? '1px solid rgba(255,255,255,0.06)' : '1px solid #e2e8f0',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: 'min(90dvh, 920px)',
        overflow: 'hidden',
    };

    const borderColor = mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#f1f5f9';

    return (
        <Dialog
            open={open}
            onClose={loading ? undefined : onClose}
            maxWidth={resolvedMaxWidth}
            fullWidth={fullWidth}
            aria-labelledby={titleId}
            scroll="paper"
            PaperProps={{
                sx: paperSx,
                ...paperProps,
            }}
            BackdropProps={{
                sx: {
                    backdropFilter: 'blur(4px)',
                    bgcolor: 'rgba(0,0,0,0.4)',
                },
            }}
        >
            <DialogTitle
                id={titleId}
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexShrink: 0,
                    p: 2.5,
                    borderBottom: '1px solid',
                    borderColor,
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
                    {icon && (
                        <Box
                            sx={{
                                width: 40,
                                height: 40,
                                borderRadius: '8px',
                                bgcolor: 'rgba(37, 99, 235, 0.1)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                            }}
                        >
                            <span className="material-icons-round" style={{ fontSize: 22, color: '#2563eb' }}>
                                {icon}
                            </span>
                        </Box>
                    )}
                    <Box sx={{ minWidth: 0 }}>
                        <Typography component="span" sx={{ fontSize: 18, fontWeight: 600, display: 'block' }}>
                            {title}
                        </Typography>
                        {subtitle && (
                            <Typography sx={{ fontSize: 13, color: mode === 'dark' ? '#94a3b8' : '#64748b' }}>
                                {subtitle}
                            </Typography>
                        )}
                    </Box>
                </Box>
                <IconButton onClick={onClose} disabled={loading} size="small" aria-label="Fechar">
                    <span className="material-icons-round" style={{ fontSize: 20 }}>
                        close
                    </span>
                </IconButton>
            </DialogTitle>

            <DialogContent
                sx={{
                    flex: 1,
                    minHeight: 0,
                    overflowY: 'auto',
                    px: 2.5,
                    // spacing(2) + 5px — respiro extra antes do footer (alinhado ao espaço visual do label no topo)
                    paddingBottom: `calc(${theme.spacing(2)} + 5px) !important`,
                    ...contentSx,
                    // Por último: sempre com !important (ver resolveDialogContentPaddingTop)
                    paddingTop: resolveDialogContentPaddingTop(theme, contentSx),
                }}
            >
                {children}
            </DialogContent>

            {footer != null ? (
                <DialogActions
                    sx={{
                        flexShrink: 0,
                        p: 2.5,
                        borderTop: '1px solid',
                        borderColor,
                        gap: 1,
                        justifyContent: 'flex-end',
                        flexWrap: 'wrap',
                    }}
                >
                    {footer}
                </DialogActions>
            ) : (
                actions &&
                actions.length > 0 && (
                    <DialogActions
                        sx={{
                            flexShrink: 0,
                            p: 2.5,
                            borderTop: '1px solid',
                            borderColor,
                            gap: 1,
                        }}
                    >
                        {actions.map((action, idx) => (
                            <Button
                                key={idx}
                                type={action.type || 'button'}
                                onClick={action.onClick}
                                variant={action.variant || (idx === actions.length - 1 ? 'contained' : 'outlined')}
                                color={action.color || 'primary'}
                                disabled={loading || action.disabled}
                                startIcon={
                                    loading && idx === actions.length - 1 ? (
                                        <CircularProgress size={18} color="inherit" />
                                    ) : null
                                }
                                sx={{
                                    borderRadius: '8px',
                                    textTransform: 'none',
                                    fontWeight: 600,
                                }}
                            >
                                {action.label}
                            </Button>
                        ))}
                    </DialogActions>
                )
            )}
        </Dialog>
    );
};

export default StandardModal;
export { SIZE_PRESET_TO_MAX_WIDTH, resolveDialogContentPaddingTop };
