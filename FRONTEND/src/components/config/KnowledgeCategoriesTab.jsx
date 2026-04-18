import React, { useState, useEffect, useContext } from 'react';
import { Box, Typography, Button, IconButton, TextField, CircularProgress } from '@mui/material';
import { useSnackbar } from 'notistack';
import KnowledgeCategoryService from '../../services/knowledge-category.service';
import ConfirmDialog from '../common/ConfirmDialog';
import StandardModal from '../common/StandardModal';
import { ThemeContext } from '../../contexts/ThemeContext';

// Modal for creating/editing category
const CategoryModal = ({ open, onClose, onSuccess, editData }) => {
    const [formData, setFormData] = useState({ name: '', description: '', color: '#2563eb' });
    const [loading, setLoading] = useState(false);
    const { enqueueSnackbar } = useSnackbar();
    const labelProps = (hasValue) => ({
        shrink: hasValue,
        sx: {
            transform: 'translate(14px, 12px) scale(1)',
            lineHeight: 1,
            '&.MuiInputLabel-shrink': { transform: 'translate(14px, -9px) scale(0.75)' }
        }
    });

    useEffect(() => {
        if (editData) {
            setFormData({
                name: editData.name || '',
                description: editData.description || '',
                color: editData.color || '#2563eb'
            });
        } else {
            setFormData({ name: '', description: '', color: '#2563eb' });
        }
    }, [editData, open]);

    const handleSubmit = async () => {
        if (!formData.name.trim()) {
            enqueueSnackbar('Nome e obrigatorio.', { variant: 'warning' });
            return;
        }
        setLoading(true);
        try {
            if (editData) {
                await KnowledgeCategoryService.update(editData.id, formData);
                enqueueSnackbar('Categoria atualizada!', { variant: 'success' });
            } else {
                await KnowledgeCategoryService.create(formData);
                enqueueSnackbar('Categoria criada!', { variant: 'success' });
            }
            onSuccess();
            onClose();
        } catch (error) {
            enqueueSnackbar(error.response?.data?.error || 'Erro ao salvar categoria.', { variant: 'error' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <StandardModal
            open={open}
            onClose={onClose}
            title={editData ? 'Editar Categoria' : 'Nova Categoria'}
            icon="category"
            maxWidth="xs"
            loading={loading}
            actions={[
                { label: 'Cancelar', onClick: onClose },
                { label: 'Salvar', onClick: handleSubmit },
            ]}
        >
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                    label="Nome"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    fullWidth
                    autoFocus
                    InputLabelProps={labelProps(!!formData.name)}
                />
                <TextField
                    label="Descricao (opcional)"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    fullWidth
                    multiline
                    rows={2}
                    InputLabelProps={labelProps(!!formData.description)}
                />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <TextField
                        label="Cor"
                        type="color"
                        value={formData.color}
                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                        sx={{ width: 100 }}
                        InputProps={{ sx: { height: 56 } }}
                        InputLabelProps={{ shrink: true }}
                    />
                    <Box
                        sx={{
                            flex: 1,
                            height: 40,
                            bgcolor: formData.color,
                            borderRadius: '8px',
                            border: '2px solid rgba(255, 255, 255, 0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontWeight: 600,
                            fontSize: '13px'
                        }}
                    >
                        Preview
                    </Box>
                </Box>
            </Box>
        </StandardModal>
    );
};

const KnowledgeCategoriesTab = () => {
    const { mode } = useContext(ThemeContext);
    const isDark = mode === 'dark';
    const textPrimary = isDark ? '#f1f5f9' : '#0f172a';
    const textSecondary = isDark ? '#94a3b8' : '#475569';
    const textMuted = isDark ? '#64748b' : '#64748b';
    const cardBg = isDark ? 'linear-gradient(145deg, #1a222d 0%, #151c25 100%)' : '#ffffff';
    const cardBorder = isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid rgba(15, 23, 42, 0.08)';
    const surfaceBg = isDark ? '#1c2632' : '#f1f5f9';
    const rowHoverBg = isDark ? '#1c2632' : '#f1f5f9';

    const cardStyle = {
        background: cardBg,
        border: cardBorder,
        borderRadius: '8px'
    };

    const tableHeaderStyle = {
        background: surfaceBg,
        color: textMuted,
        fontSize: '11px',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        padding: '12px 16px',
        borderBottom: cardBorder,
        textAlign: 'left',
        whiteSpace: 'nowrap'
    };

    const tableCellStyle = {
        color: textSecondary,
        fontSize: '13px',
        padding: '14px 16px',
        borderBottom: cardBorder
    };

    const actionBtnStyle = (type = 'edit') => ({
        width: 32, height: 32, borderRadius: '8px',
        background: type === 'delete' ? 'rgba(244, 63, 94, 0.1)' : surfaceBg,
        border: cardBorder,
        color: type === 'delete' ? '#f43f5e' : textSecondary,
        '&:hover': {
            background: type === 'delete' ? 'rgba(244, 63, 94, 0.2)' : 'rgba(37, 99, 235, 0.12)',
            color: type === 'delete' ? '#f43f5e' : '#2563eb',
            borderColor: type === 'delete' ? '#f43f5e' : '#2563eb'
        }
    });
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editData, setEditData] = useState(null);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [deleteId, setDeleteId] = useState(null);
    const { enqueueSnackbar } = useSnackbar();

    const loadData = async () => {
        try {
            setLoading(true);
            const data = await KnowledgeCategoryService.getAll(true); // Include inactive
            setCategories(data);
        } catch (error) {
            enqueueSnackbar('Erro ao carregar categorias.', { variant: 'error' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    const handleEdit = (item) => { setEditData(item); setModalOpen(true); };
    const handleAdd = () => { setEditData(null); setModalOpen(true); };
    const handleDeleteClick = (id) => { setDeleteId(id); setConfirmOpen(true); };

    const handleConfirmDelete = async () => {
        if (!deleteId) return;
        try {
            await KnowledgeCategoryService.delete(deleteId);
            loadData();
            enqueueSnackbar('Categoria removida.', { variant: 'success' });
            setConfirmOpen(false);
            setDeleteId(null);
        } catch (error) {
            enqueueSnackbar('Erro ao remover categoria.', { variant: 'error' });
        }
    };

    return (
        <>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography sx={{ fontSize: '20px', fontWeight: 600, color: textPrimary }}>
                    Categorias da Base de Conhecimento
                </Typography>
                <Button
                    onClick={handleAdd}
                    sx={{
                        padding: '10px 20px',
                        borderRadius: '8px',
                        fontSize: '13px',
                        fontWeight: 600,
                        textTransform: 'none',
                        background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
                        color: 'white',
                        boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
                        '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 6px 16px rgba(37, 99, 235, 0.4)' }
                    }}
                    startIcon={<span className="material-icons-round" style={{ fontSize: '16px' }}>add</span>}
                >
                    Nova Categoria
                </Button>
            </Box>

            <Box sx={{ ...cardStyle, overflow: 'hidden' }}>
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                        <CircularProgress sx={{ color: '#2563eb' }} />
                    </Box>
                ) : (
                    <Box sx={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr>
                                    <th style={tableHeaderStyle}>Cor</th>
                                    <th style={tableHeaderStyle}>Nome</th>
                                    <th style={tableHeaderStyle}>Descricao</th>
                                    <th style={tableHeaderStyle}>Artigos</th>
                                    <th style={tableHeaderStyle}>Status</th>
                                    <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>Acoes</th>
                                </tr>
                            </thead>
                            <tbody>
                                {categories.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} style={{ ...tableCellStyle, textAlign: 'center', padding: '60px' }}>
                                            <span className="material-icons-round" style={{ fontSize: '64px', color: textMuted, opacity: 0.5, display: 'block', marginBottom: '16px' }}>
                                                category
                                            </span>
                                            <Typography sx={{ color: textMuted, fontSize: '16px', mb: 1 }}>
                                                Nenhuma categoria cadastrada
                                            </Typography>
                                            <Typography sx={{ color: textMuted, fontSize: '14px' }}>
                                                Clique em "Nova Categoria" para comecar
                                            </Typography>
                                        </td>
                                    </tr>
                                ) : categories.map((cat) => (
                                    <tr
                                        key={cat.id}
                                        style={{ transition: 'background 0.2s' }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = rowHoverBg}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <td style={tableCellStyle}>
                                            <Box
                                                sx={{
                                                    width: 32,
                                                    height: 32,
                                                    borderRadius: '8px',
                                                    bgcolor: cat.color,
                                                    border: '2px solid rgba(255, 255, 255, 0.1)'
                                                }}
                                            />
                                        </td>
                                        <td style={tableCellStyle}>
                                            <strong style={{ color: textPrimary }}>{cat.name}</strong>
                                        </td>
                                        <td style={tableCellStyle}>
                                            {cat.description || <span style={{ color: textMuted }}>-</span>}
                                        </td>
                                        <td style={tableCellStyle}>
                                            <span style={{
                                                padding: '4px 10px',
                                                borderRadius: '8px',
                                                fontSize: '12px',
                                                fontWeight: 600,
                                                background: 'rgba(37, 99, 235, 0.15)',
                                                color: '#818cf8'
                                            }}>
                                                {cat._count?.articles || 0} artigos
                                            </span>
                                        </td>
                                        <td style={tableCellStyle}>
                                            <span style={{
                                                padding: '6px 12px',
                                                borderRadius: '8px',
                                                fontSize: '12px',
                                                fontWeight: 600,
                                                background: cat.isActive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(100, 116, 139, 0.15)',
                                                color: cat.isActive ? '#10b981' : '#64748b'
                                            }}>
                                                {cat.isActive ? 'Ativo' : 'Inativo'}
                                            </span>
                                        </td>
                                        <td style={{ ...tableCellStyle, textAlign: 'right' }}>
                                            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                                                <IconButton onClick={() => handleEdit(cat)} sx={actionBtnStyle('edit')}>
                                                    <span className="material-icons-round" style={{ fontSize: '18px' }}>edit</span>
                                                </IconButton>
                                                <IconButton onClick={() => handleDeleteClick(cat.id)} sx={actionBtnStyle('delete')}>
                                                    <span className="material-icons-round" style={{ fontSize: '18px' }}>delete</span>
                                                </IconButton>
                                            </Box>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </Box>
                )}
            </Box>

            <CategoryModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                onSuccess={loadData}
                editData={editData}
            />
            <ConfirmDialog
                open={confirmOpen}
                onClose={() => setConfirmOpen(false)}
                onConfirm={handleConfirmDelete}
                title="Excluir Categoria"
                content="Tem certeza que deseja excluir esta categoria? Se houver artigos vinculados, ela sera apenas desativada."
            />
        </>
    );
};

export default KnowledgeCategoriesTab;
