import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    Button,
    useTheme
} from '@mui/material';
import { Warning, Delete, Info } from '@mui/icons-material';

/**
 * A reusable confirmation dialog component using Material UI.
 * 
 * @param {boolean} open - Whether the dialog is open.
 * @param {string} title - The title of the dialog.
 * @param {string} content - The main message of the dialog.
 * @param {function} onConfirm - Callback for the confirm action.
 * @param {function} onClose - Callback for closing the dialog without confirming.
 * @param {string} confirmText - Text for the confirm button (default: "Confirmar").
 * @param {string} cancelText - Text for the cancel button (default: "Cancelar").
 * @param {string} confirmColor - Color of the confirm button (default: "error" for delete actions).
 * @param {string} variant - "danger" | "info" | "warning" (default: "danger").
 */
const ConfirmDialog = ({
    open,
    title,
    content,
    onConfirm,
    onClose,
    confirmText = "Confirmar",
    cancelText = "Cancelar",
    confirmColor = "error",
    variant = "danger"
}) => {
    const theme = useTheme();

    const getIcon = () => {
        switch (variant) {
            case 'warning': return <Warning sx={{ fontSize: 40, color: theme.palette.warning.main }} />;
            case 'info': return <Info sx={{ fontSize: 40, color: theme.palette.info.main }} />;
            case 'danger':
            default: return <Delete sx={{ fontSize: 40, color: theme.palette.error.main }} />;
        }
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            aria-labelledby="confirm-dialog-title"
            aria-describedby="confirm-dialog-description"
            PaperProps={{
                sx: {
                    borderRadius: 2,
                    padding: 1,
                    minWidth: '320px'
                }
            }}
        >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 16 }}>
                {getIcon()}
            </div>

            <DialogTitle id="confirm-dialog-title" sx={{ textAlign: 'center', fontWeight: 'bold' }}>
                {title}
            </DialogTitle>

            <DialogContent>
                <DialogContentText id="confirm-dialog-description" sx={{ textAlign: 'center' }}>
                    {content}
                </DialogContentText>
            </DialogContent>

            <DialogActions sx={{ justifyContent: 'center', paddingBottom: 2 }}>
                <Button onClick={onClose} variant="outlined" color="inherit" sx={{ borderRadius: 2, textTransform: 'none' }}>
                    {cancelText}
                </Button>
                <Button
                    onClick={onConfirm}
                    variant="contained"
                    color={confirmColor}
                    autoFocus
                    sx={{ borderRadius: 2, textTransform: 'none', px: 3 }}
                >
                    {confirmText}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default ConfirmDialog;
