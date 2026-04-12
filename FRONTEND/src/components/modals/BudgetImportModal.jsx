import React, { useState, useRef } from 'react';
import {
    Dialog, DialogContent, DialogActions,
    Button, Typography, Box, LinearProgress, Alert, List, ListItem, ListItemIcon, ListItemText,
    Divider, IconButton, Chip, Fade
} from '@mui/material';
import {
    Close, CloudUpload, Download, InsertDriveFile, CheckCircle,
    Error as ErrorIcon, UploadFile, TableChart
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import api from '../../services/api';

const BudgetImportModal = ({ open, onClose, budgetId, onSuccess }) => {
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [errors, setErrors] = useState([]);
    const [dragOver, setDragOver] = useState(false);
    const fileInputRef = useRef(null);
    const { enqueueSnackbar } = useSnackbar();

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            setFile(selectedFile);
            setErrors([]);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile && /\.(xlsx|xls|csv)$/.test(droppedFile.name)) {
            setFile(droppedFile);
            setErrors([]);
        } else {
            enqueueSnackbar('Formato inválido. Use .xlsx, .xls ou .csv', { variant: 'warning' });
        }
    };

    const handleUpload = async () => {
        if (!file) return;
        setUploading(true);
        setErrors([]);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await api.post(`/budgets/${budgetId}/import`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            enqueueSnackbar(`Importação concluída! ${response.data.importedCount} itens criados.`, { variant: 'success' });
            onSuccess();
            handleClose();
        } catch (error) {
            console.error(error);
            const msg = error.response?.data?.error || 'Erro ao importar arquivo.';
            enqueueSnackbar(msg, { variant: 'error' });
            if (error.response?.data?.details) {
                setErrors(error.response.data.details);
            }
        } finally {
            setUploading(false);
        }
    };

    const handleClose = () => {
        if (!uploading) {
            setFile(null);
            setErrors([]);
            setDragOver(false);
            onClose();
        }
    };

    const downloadTemplate = () => {
        const headers = ['Conta', 'Centro de Custo', 'Descricao', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        const csvContent = headers.join(';') + '\n' + '1.01.001;CC_001;Despesa Exemplo;1000;1000;1000;1000;1000;1000;1000;1000;1000;1000;1000;1000';
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'modelo_orcamento.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const formatFileSize = (bytes) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / 1048576).toFixed(1) + ' MB';
    };

    return (
        <Dialog
            open={open}
            onClose={uploading ? undefined : handleClose}
            maxWidth="sm"
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: '20px',
                    overflow: 'hidden',
                    boxShadow: '0 25px 60px rgba(0,0,0,0.15)',
                }
            }}
        >
            {/* Header */}
            <Box sx={{
                px: 3.5, py: 3,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                borderBottom: '1px solid', borderColor: 'divider',
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{
                        width: 44, height: 44, borderRadius: '12px',
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                    }}>
                        <UploadFile sx={{ color: 'white', fontSize: 22 }} />
                    </Box>
                    <Box>
                        <Typography sx={{ fontWeight: 700, fontSize: '18px', color: 'text.primary' }}>
                            Importar Itens de Orçamento
                        </Typography>
                        <Typography sx={{ fontSize: '13px', color: 'text.secondary' }}>
                            Carregue uma planilha com os itens do orçamento
                        </Typography>
                    </Box>
                </Box>
                <IconButton
                    onClick={handleClose}
                    disabled={uploading}
                    size="small"
                    sx={{
                        color: 'text.secondary',
                        '&:hover': { bgcolor: 'error.light', color: 'error.main' }
                    }}
                >
                    <Close fontSize="small" />
                </IconButton>
            </Box>

            <DialogContent sx={{ px: 3.5, py: 3 }}>
                {/* Step 1: Download template */}
                <Box sx={{
                    display: 'flex', alignItems: 'center', gap: 2, mb: 3,
                    p: 2, borderRadius: '12px',
                    bgcolor: 'action.hover',
                    border: '1px solid', borderColor: 'divider',
                }}>
                    <Box sx={{
                        width: 36, height: 36, borderRadius: '8px',
                        bgcolor: 'primary.main', color: 'white',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '14px', fontWeight: 800, flexShrink: 0
                    }}>1</Box>
                    <Box sx={{ flex: 1 }}>
                        <Typography sx={{ fontSize: '13px', fontWeight: 600, color: 'text.primary' }}>
                            Baixe o modelo de planilha
                        </Typography>
                        <Typography sx={{ fontSize: '12px', color: 'text.secondary' }}>
                            Use o modelo para garantir o formato correto dos dados
                        </Typography>
                    </Box>
                    <Button
                        size="small"
                        onClick={downloadTemplate}
                        startIcon={<Download sx={{ fontSize: 16 }} />}
                        sx={{
                            textTransform: 'none', fontWeight: 600, fontSize: '12px',
                            borderRadius: '8px', px: 2,
                            color: '#10b981',
                            border: '1px solid',
                            borderColor: '#10b98140',
                            '&:hover': { bgcolor: '#10b98110', borderColor: '#10b981' }
                        }}
                    >
                        Baixar CSV
                    </Button>
                </Box>

                {/* Step 2: Upload area */}
                <Box sx={{
                    display: 'flex', alignItems: 'center', gap: 2, mb: 2,
                }}>
                    <Box sx={{
                        width: 36, height: 36, borderRadius: '8px',
                        bgcolor: 'primary.main', color: 'white',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '14px', fontWeight: 800, flexShrink: 0
                    }}>2</Box>
                    <Typography sx={{ fontSize: '13px', fontWeight: 600, color: 'text.primary' }}>
                        Selecione o arquivo para importar
                    </Typography>
                </Box>

                {/* Upload Zone */}
                <Box
                    onDrop={handleDrop}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onClick={() => fileInputRef.current?.click()}
                    sx={{
                        border: '2px dashed',
                        borderColor: dragOver ? '#10b981' : file ? '#10b981' : 'divider',
                        borderRadius: '14px',
                        p: file ? 2.5 : 4,
                        textAlign: 'center',
                        cursor: 'pointer',
                        bgcolor: dragOver ? '#10b98108' : file ? '#10b98108' : 'transparent',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                            borderColor: '#10b981',
                            bgcolor: '#10b98108',
                        }
                    }}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        hidden
                        accept=".xlsx,.xls,.csv"
                        onChange={handleFileChange}
                    />

                    {!file ? (
                        <Box>
                            <CloudUpload sx={{ fontSize: 44, color: 'text.disabled', mb: 1.5 }} />
                            <Typography sx={{ fontWeight: 600, fontSize: '15px', color: 'text.primary', mb: 0.5 }}>
                                Arraste e solte seu arquivo aqui
                            </Typography>
                            <Typography sx={{ fontSize: '13px', color: 'text.secondary', mb: 2 }}>
                                ou clique para selecionar
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                                <Chip label=".xlsx" size="small" variant="outlined" sx={{ fontSize: '11px', height: 24, borderColor: 'divider' }} />
                                <Chip label=".xls" size="small" variant="outlined" sx={{ fontSize: '11px', height: 24, borderColor: 'divider' }} />
                                <Chip label=".csv" size="small" variant="outlined" sx={{ fontSize: '11px', height: 24, borderColor: 'divider' }} />
                            </Box>
                        </Box>
                    ) : (
                        <Fade in>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Box sx={{
                                    width: 48, height: 48, borderRadius: '12px',
                                    bgcolor: '#10b98115',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    flexShrink: 0
                                }}>
                                    <TableChart sx={{ color: '#10b981', fontSize: 24 }} />
                                </Box>
                                <Box sx={{ flex: 1, textAlign: 'left' }}>
                                    <Typography sx={{ fontWeight: 600, fontSize: '14px', color: 'text.primary', lineHeight: 1.3 }}>
                                        {file.name}
                                    </Typography>
                                    <Typography sx={{ fontSize: '12px', color: 'text.secondary' }}>
                                        {formatFileSize(file.size)} • Pronto para importar
                                    </Typography>
                                </Box>
                                <CheckCircle sx={{ color: '#10b981', fontSize: 24 }} />
                            </Box>
                        </Fade>
                    )}
                </Box>

                {/* Upload progress */}
                {uploading && (
                    <Box sx={{ mt: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography sx={{ fontSize: '12px', fontWeight: 600, color: 'text.secondary' }}>Importando...</Typography>
                        </Box>
                        <LinearProgress
                            sx={{
                                height: 6, borderRadius: 3,
                                bgcolor: '#10b98120',
                                '& .MuiLinearProgress-bar': {
                                    background: 'linear-gradient(90deg, #10b981, #059669)',
                                    borderRadius: 3
                                }
                            }}
                        />
                    </Box>
                )}

                {/* Errors section */}
                {errors.length > 0 && (
                    <Box sx={{
                        mt: 2.5, maxHeight: '180px', overflowY: 'auto',
                        border: '1px solid', borderColor: 'error.light',
                        borderRadius: '12px', overflow: 'hidden'
                    }}>
                        <Alert
                            severity="error"
                            icon={<ErrorIcon fontSize="small" />}
                            sx={{
                                borderRadius: 0, py: 0.5,
                                '& .MuiAlert-message': { fontWeight: 600, fontSize: '13px' }
                            }}
                        >
                            {errors.length} {errors.length === 1 ? 'item rejeitado' : 'itens rejeitados'}
                        </Alert>
                        <List dense disablePadding>
                            {errors.map((err, idx) => (
                                <React.Fragment key={idx}>
                                    <ListItem sx={{ py: 0.5, px: 2 }}>
                                        <ListItemIcon sx={{ minWidth: 28 }}>
                                            <ErrorIcon sx={{ color: 'error.main', fontSize: 16 }} />
                                        </ListItemIcon>
                                        <ListItemText
                                            primary={err}
                                            primaryTypographyProps={{
                                                fontSize: '12px',
                                                color: 'error.main'
                                            }}
                                        />
                                    </ListItem>
                                    {idx < errors.length - 1 && <Divider />}
                                </React.Fragment>
                            ))}
                        </List>
                    </Box>
                )}
            </DialogContent>

            {/* Footer */}
            <DialogActions sx={{
                px: 3.5, py: 2.5,
                borderTop: '1px solid', borderColor: 'divider',
                gap: 1.5
            }}>
                <Button
                    onClick={handleClose}
                    disabled={uploading}
                    sx={{
                        color: 'text.secondary', fontWeight: 600,
                        textTransform: 'none', borderRadius: '10px', px: 3,
                        '&:hover': { bgcolor: 'action.hover' }
                    }}
                >
                    Cancelar
                </Button>
                <Button
                    onClick={handleUpload}
                    disabled={!file || uploading}
                    variant="contained"
                    startIcon={<UploadFile sx={{ fontSize: 18 }} />}
                    sx={{
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        color: 'white', fontWeight: 700, textTransform: 'none',
                        borderRadius: '10px', px: 3,
                        boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
                        '&:hover': {
                            background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                            boxShadow: '0 6px 20px rgba(16, 185, 129, 0.45)',
                        },
                        '&:disabled': {
                            background: 'action.disabledBackground',
                            color: 'action.disabled',
                            boxShadow: 'none'
                        }
                    }}
                >
                    Importar Arquivo
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default BudgetImportModal;
