import React, { useState, useRef } from 'react';
import {
    Button, Typography, Box, LinearProgress, Alert, List, ListItem, ListItemIcon, ListItemText,
    Divider, Chip, Fade
} from '@mui/material';
import {
    CloudUpload, Download, CheckCircle,
    Error as ErrorIcon, UploadFile, TableChart
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import api from '../../services/api';
import StandardModal from '../common/StandardModal';

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
        <StandardModal
            open={open}
            onClose={handleClose}
            title="Importar itens de orçamento"
            subtitle="Carregue uma planilha com os itens"
            icon="upload_file"
            size="form"
            loading={uploading}
            footer={
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'flex-end', width: '100%' }}>
                    <Button type="button" onClick={handleClose} disabled={uploading} sx={{ textTransform: 'none', fontWeight: 600 }}>
                        Cancelar
                    </Button>
                    <Button
                        type="button"
                        onClick={handleUpload}
                        disabled={!file || uploading}
                        variant="contained"
                        color="primary"
                        startIcon={<UploadFile sx={{ fontSize: 18 }} />}
                        sx={{ textTransform: 'none', fontWeight: 600 }}
                    >
                        Importar arquivo
                    </Button>
                </Box>
            }
        >
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
                    <Typography sx={{ fontSize: '13px', fontWeight: 600 }}>
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
                    sx={{ textTransform: 'none', fontWeight: 600, fontSize: '12px' }}
                    variant="outlined"
                    color="success"
                >
                    Baixar CSV
                </Button>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Box sx={{
                    width: 36, height: 36, borderRadius: '8px',
                    bgcolor: 'primary.main', color: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '14px', fontWeight: 800, flexShrink: 0
                }}>2</Box>
                <Typography sx={{ fontSize: '13px', fontWeight: 600 }}>
                    Selecione o arquivo para importar
                </Typography>
            </Box>

            <Box
                onDrop={handleDrop}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onClick={() => fileInputRef.current?.click()}
                sx={{
                    border: '2px dashed',
                    borderColor: dragOver ? 'success.main' : file ? 'success.main' : 'divider',
                    borderRadius: '14px',
                    p: file ? 2.5 : 4,
                    textAlign: 'center',
                    cursor: 'pointer',
                    bgcolor: dragOver ? 'success.light' : file ? 'action.hover' : 'transparent',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                        borderColor: 'success.main',
                        bgcolor: 'action.hover',
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
                        <Typography sx={{ fontWeight: 600, fontSize: '15px', mb: 0.5 }}>
                            Arraste e solte seu arquivo aqui
                        </Typography>
                        <Typography sx={{ fontSize: '13px', color: 'text.secondary', mb: 2 }}>
                            ou clique para selecionar
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                            <Chip label=".xlsx" size="small" variant="outlined" sx={{ fontSize: '11px', height: 24 }} />
                            <Chip label=".xls" size="small" variant="outlined" sx={{ fontSize: '11px', height: 24 }} />
                            <Chip label=".csv" size="small" variant="outlined" sx={{ fontSize: '11px', height: 24 }} />
                        </Box>
                    </Box>
                ) : (
                    <Fade in>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Box sx={{
                                width: 48, height: 48, borderRadius: '12px',
                                bgcolor: 'success.light',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0
                            }}>
                                <TableChart sx={{ color: 'success.main', fontSize: 24 }} />
                            </Box>
                            <Box sx={{ flex: 1, textAlign: 'left' }}>
                                <Typography sx={{ fontWeight: 600, fontSize: '14px', lineHeight: 1.3 }}>
                                    {file.name}
                                </Typography>
                                <Typography sx={{ fontSize: '12px', color: 'text.secondary' }}>
                                    {formatFileSize(file.size)} • Pronto para importar
                                </Typography>
                            </Box>
                            <CheckCircle sx={{ color: 'success.main', fontSize: 24 }} />
                        </Box>
                    </Fade>
                )}
            </Box>

            {uploading && (
                <Box sx={{ mt: 2 }}>
                    <Typography sx={{ fontSize: '12px', fontWeight: 600, color: 'text.secondary', mb: 0.5 }}>Importando…</Typography>
                    <LinearProgress sx={{ height: 6, borderRadius: 3 }} />
                </Box>
            )}

            {errors.length > 0 && (
                <Box sx={{
                    mt: 2.5, maxHeight: '180px', overflowY: 'auto',
                    border: '1px solid', borderColor: 'error.light',
                    borderRadius: '12px', overflow: 'hidden'
                }}>
                    <Alert severity="error" icon={<ErrorIcon fontSize="small" />} sx={{ borderRadius: 0, py: 0.5 }}>
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
                                        primaryTypographyProps={{ fontSize: '12px', color: 'error.main' }}
                                    />
                                </ListItem>
                                {idx < errors.length - 1 && <Divider />}
                            </React.Fragment>
                        ))}
                    </List>
                </Box>
            )}
        </StandardModal>
    );
};

export default BudgetImportModal;
