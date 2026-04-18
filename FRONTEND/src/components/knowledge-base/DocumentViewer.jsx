import React, { useEffect, useRef } from 'react';
import { Box, Typography } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import StandardModal from '../common/StandardModal';
import { getFileURL } from '../../utils/urlUtils';

export default function DocumentViewer({ open, onClose, fileUrl, title, description }) {
    const src = getFileURL(fileUrl);
    const hasOpenedRef = useRef(false);

    // Abre automaticamente o PDF em nova aba quando o modal abre
    useEffect(() => {
        if (!open) {
            hasOpenedRef.current = false;
            return;
        }
        if (open && src && !hasOpenedRef.current) {
            window.open(src, '_blank');
            hasOpenedRef.current = true;
        }
    }, [open, src]);

    // Abre o PDF em uma nova aba
    const handleOpenInNewTab = () => {
        if (src) {
            window.open(src, '_blank');
            onClose();
        }
    };

    return (
        <StandardModal
            open={open}
            onClose={onClose}
            title={title || 'Documento'}
            icon="picture_as_pdf"
            maxWidth="sm"
        >
            <Box sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 3,
                py: 1,
            }}
            >
                <PictureAsPdfIcon sx={{ fontSize: 64, color: '#ef4444' }} />

                {src && (
                    <>
                        <Typography variant="body1" textAlign="center" color="text.secondary">
                            O documento esta sendo aberto em uma nova aba.
                        </Typography>

                        <Typography variant="body2" textAlign="center" color="text.secondary">
                            Se nao abriu automaticamente, clique no botao abaixo:
                        </Typography>
                    </>
                )}

                {description && (
                    <Box sx={{ width: '100%', p: 2, bgcolor: 'action.hover', borderRadius: '8px'}}>
                        <Typography variant="subtitle2" gutterBottom>
                            Descricao
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {description}
                        </Typography>
                    </Box>
                )}

                {!src && (
                    <Typography variant="body2" textAlign="center" color="text.secondary">
                        Este artigo nao possui anexo.
                    </Typography>
                )}

                <Box
                    component="button"
                    onClick={handleOpenInNewTab}
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        bgcolor: '#2563eb',
                        color: 'white',
                        border: 'none',
                        padding: '12px 24px',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        opacity: src ? 1 : 0.6,
                        pointerEvents: src ? 'auto' : 'none',
                        '&:hover': {
                            bgcolor: '#5558e3',
                            transform: 'translateY(-1px)'
                        }
                    }}
                >
                    <OpenInNewIcon sx={{ fontSize: 18 }} />
                    Abrir Documento
                </Box>
            </Box>
        </StandardModal>
    );
}


