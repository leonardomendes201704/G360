import React, { useState, useEffect } from 'react';
import {
    TextField,
    Button,
    MenuItem,
    Typography,
    Box,
    styled,
    IconButton,
    CircularProgress,
    Tooltip
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import AddIcon from '@mui/icons-material/Add';
import KnowledgeCategoryService from '../../services/knowledge-category.service';
import { useSnackbar } from 'notistack';
import StandardModal from '../common/StandardModal';

const UploadBox = styled(Box)(({ theme }) => ({
    border: `2px dashed ${theme.palette.divider}`,
    borderRadius: theme.shape.borderRadius,
    padding: theme.spacing(3),
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'border-color 0.3s',
    '&:hover': {
        borderColor: theme.palette.primary.main,
    },
}));

function NewCategoryDialog({ open, onClose, onCreated }) {
    const [name, setName] = useState('');
    const [color, setColor] = useState('#2563eb');
    const [loading, setLoading] = useState(false);
    const { enqueueSnackbar } = useSnackbar();

    const handleCreate = async () => {
        if (!name.trim()) {
            enqueueSnackbar('Nome da categoria é obrigatório', { variant: 'warning' });
            return;
        }
        setLoading(true);
        try {
            const created = await KnowledgeCategoryService.create({ name: name.trim(), color });
            enqueueSnackbar('Categoria criada com sucesso!', { variant: 'success' });
            onCreated(created);
            setName('');
            setColor('#2563eb');
            onClose();
        } catch (error) {
            enqueueSnackbar(error.response?.data?.error || 'Erro ao criar categoria', { variant: 'error' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <StandardModal
            open={open}
            onClose={onClose}
            title="Nova Categoria"
            icon="create_new_folder"
            size="form"
            loading={loading}
            footer={
                <>
                    <Button variant="outlined" onClick={onClose} disabled={loading}>
                        Cancelar
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleCreate}
                        disabled={loading}
                        startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
                    >
                        Criar
                    </Button>
                </>
            }
        >
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                    label="Nome da Categoria"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    fullWidth
                    autoFocus
                />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <TextField
                        label="Cor"
                        type="color"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        sx={{ width: 100 }}
                        InputProps={{ sx: { height: 56 } }}
                    />
                    <Box
                        sx={{
                            width: 40,
                            height: 40,
                            bgcolor: color,
                            borderRadius: '8px',
                            border: '2px solid var(--modal-border)'
                        }}
                    />
                </Box>
            </Box>
        </StandardModal>
    );
}

export default function KnowledgeBaseModal({ open, onClose, onSubmit, initialData }) {
    const [formData, setFormData] = useState({
        title: '',
        categoryId: '',
        tags: '',
        content: '',
    });
    const [file, setFile] = useState(null);
    const [categories, setCategories] = useState([]);
    const [loadingCategories, setLoadingCategories] = useState(false);
    const [newCategoryOpen, setNewCategoryOpen] = useState(false);

    useEffect(() => {
        if (open) {
            loadCategories();
        }
    }, [open]);

    const loadCategories = async () => {
        setLoadingCategories(true);
        try {
            const data = await KnowledgeCategoryService.getAll();
            setCategories(data);
        } catch (error) {
            console.error('Failed to load categories:', error);
        } finally {
            setLoadingCategories(false);
        }
    };

    useEffect(() => {
        if (initialData) {
            setFormData({
                title: initialData.title || '',
                categoryId: initialData.categoryId || initialData.category?.id || '',
                tags: Array.isArray(initialData.tags) ? initialData.tags.join(', ') : (initialData.tags || ''),
                content: initialData.content || '',
            });
            setFile(null);
        } else {
            setFormData({
                title: '',
                categoryId: '',
                tags: '',
                content: '',
            });
            setFile(null);
        }
    }, [initialData, open]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleSubmit = () => {
        onSubmit(formData, file);
    };

    const handleCategoryCreated = (newCategory) => {
        setCategories([...categories, newCategory]);
        setFormData({ ...formData, categoryId: newCategory.id });
    };

    return (
        <>
            <StandardModal
                open={open}
                onClose={onClose}
                title={initialData ? 'Editar Artigo' : 'Novo Artigo'}
                subtitle="Documento da base de conhecimento"
                icon="menu_book"
                size="detail"
                footer={
                    <>
                        <Button variant="outlined" onClick={onClose}>
                            Cancelar
                        </Button>
                        <Button variant="contained" color="primary" onClick={handleSubmit}>
                            Salvar
                        </Button>
                    </>
                }
            >
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                        <TextField
                            name="title"
                            label="Título do Documento"
                            fullWidth
                            value={formData.title}
                            onChange={handleChange}
                            required
                            sx={{ flex: '2 1 200px' }}
                        />
                        <Box sx={{ flex: '1 1 180px', display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                            <TextField
                                select
                                name="categoryId"
                                label="Categoria"
                                fullWidth
                                value={formData.categoryId}
                                onChange={handleChange}
                                required
                                disabled={loadingCategories}
                            >
                                {loadingCategories ? (
                                    <MenuItem disabled>Carregando...</MenuItem>
                                ) : categories.length === 0 ? (
                                    <MenuItem disabled>Nenhuma categoria</MenuItem>
                                ) : (
                                    categories.map((cat) => (
                                        <MenuItem key={cat.id} value={cat.id}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Box
                                                    sx={{
                                                        width: 12,
                                                        height: 12,
                                                        bgcolor: cat.color,
                                                        borderRadius: '8px'
                                                    }}
                                                />
                                                {cat.name}
                                            </Box>
                                        </MenuItem>
                                    ))
                                )}
                            </TextField>
                            <Tooltip title="Nova Categoria">
                                <IconButton
                                    onClick={() => setNewCategoryOpen(true)}
                                    sx={{
                                        bgcolor: 'primary.main',
                                        color: 'var(--modal-text)',
                                        '&:hover': { bgcolor: 'primary.dark' }
                                    }}
                                >
                                    <AddIcon />
                                </IconButton>
                            </Tooltip>
                        </Box>
                    </Box>

                    <TextField
                        name="tags"
                        label="Tags (separadas por vírgula)"
                        fullWidth
                        value={formData.tags}
                        onChange={handleChange}
                        placeholder="Ex: manual, onboard, politica"
                    />

                    <TextField
                        name="content"
                        label="Descrição / Resumo"
                        fullWidth
                        multiline
                        rows={4}
                        value={formData.content}
                        onChange={handleChange}
                    />

                    <Box>
                        <Typography variant="subtitle2" gutterBottom>Anexo (PDF)</Typography>
                        <input
                            accept="application/pdf"
                            style={{ display: 'none' }}
                            id="raised-button-file"
                            type="file"
                            onChange={handleFileChange}
                        />
                        <label htmlFor="raised-button-file">
                            <UploadBox>
                                <CloudUploadIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
                                <Typography variant="body1">
                                    {file ? file.name : "Clique para selecionar um arquivo PDF ou arraste aqui"}
                                </Typography>
                                {initialData && !file && (
                                    <Typography variant="caption" color="text.secondary">
                                        Deixe vazio para manter o arquivo atual (se houver).
                                    </Typography>
                                )}
                            </UploadBox>
                        </label>
                    </Box>
                </Box>
            </StandardModal>

            <NewCategoryDialog
                open={newCategoryOpen}
                onClose={() => setNewCategoryOpen(false)}
                onCreated={handleCategoryCreated}
            />
        </>
    );
}
