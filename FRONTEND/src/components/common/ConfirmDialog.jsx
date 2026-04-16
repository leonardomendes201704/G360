import React from 'react';
import { Typography } from '@mui/material';
import StandardModal from './StandardModal';

const VARIANT_ICON = {
    danger: 'delete',
    warning: 'warning',
    info: 'info',
};

/**
 * Confirmação curta — mesma casca visual que `StandardModal` (US-022).
 *
 * @param {boolean} open
 * @param {string} title
 * @param {string} content — mensagem principal
 * @param {function} onConfirm
 * @param {function} onClose
 * @param {string} [confirmText="Confirmar"]
 * @param {string} [cancelText="Cancelar"]
 * @param {string} [confirmColor="error"] — prop MUI `color` do botão de confirmação
 * @param {'danger'|'info'|'warning'} [variant="danger"]
 */
const ConfirmDialog = ({
    open,
    title,
    content,
    onConfirm,
    onClose,
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    confirmColor = 'error',
    variant = 'danger',
}) => {
    const icon = VARIANT_ICON[variant] || VARIANT_ICON.danger;

    return (
        <StandardModal
            open={open}
            onClose={onClose}
            title={title}
            icon={icon}
            maxWidth="xs"
            fullWidth
            actions={[
                { label: cancelText, onClick: onClose },
                { label: confirmText, onClick: onConfirm, color: confirmColor },
            ]}
        >
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
                {content}
            </Typography>
        </StandardModal>
    );
};

export default ConfirmDialog;
