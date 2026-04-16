import React, { useState, useEffect, useContext } from 'react';
import { Box, Button, IconButton, Typography, TextField, Switch, FormControlLabel } from '@mui/material';
import StandardModal from '../common/StandardModal';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import ptBR from 'date-fns/locale/pt-BR';
import FreezeWindowService from '../../services/freeze-window.service';
import { ThemeContext } from '../../contexts/ThemeContext';

const FreezeWindowsTab = () => {
    const { mode } = useContext(ThemeContext);
    const isDark = mode === 'dark';
    const textPrimary = isDark ? '#f1f5f9' : '#0f172a';
    const textSecondary = isDark ? '#94a3b8' : '#475569';
    const textMuted = isDark ? '#64748b' : '#64748b';
    const cardBg = isDark ? 'linear-gradient(145deg, #1a222d 0%, #151c25 100%)' : '#ffffff';
    const cardBorder = isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid rgba(15, 23, 42, 0.08)';
    const surfaceBg = isDark ? '#1c2632' : '#f1f5f9';
    const rowHoverBg = isDark ? '#1c2632' : '#f1f5f9';
    const inputBg = isDark ? '#1c2632' : '#ffffff';
    const inputBorder = isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid rgba(15, 23, 42, 0.12)';

    const cardStyle = {
        background: cardBg,
        border: cardBorder,
        borderRadius: '16px'
    };

    const tableHeaderStyle = {
        background: surfaceBg,
        color: textMuted,
        fontSize: '12px',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        padding: '16px 24px',
        borderBottom: cardBorder,
        textAlign: 'left'
    };

    const tableCellStyle = {
        color: textSecondary,
        fontSize: '14px',
        padding: '20px 24px',
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

    const inputSx = {
        '& .MuiOutlinedInput-root': {
            background: inputBg,
            color: textPrimary,
            '& fieldset': { borderColor: inputBorder }
        },
        '& .MuiInputLabel-root': { color: textMuted }
    };
    const [windows, setWindows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [openModal, setOpenModal] = useState(false);
    const [formData, setFormData] = useState({ name: '', description: '', startDate: null, endDate: null, isActive: true });
    const [editingId, setEditingId] = useState(null);

    const fetchWindows = async () => {
        setLoading(true);
        try {
            const data = await FreezeWindowService.getAll();
            setWindows(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchWindows(); }, []);

    const handleOpen = (item = null) => {
        if (item) {
            setEditingId(item.id);
            setFormData({ name: item.name, description: item.description || '', startDate: new Date(item.startDate), endDate: new Date(item.endDate), isActive: item.isActive });
        } else {
            setEditingId(null);
            setFormData({ name: '', description: '', startDate: null, endDate: null, isActive: true });
        }
        setOpenModal(true);
    };

    const handleSave = async () => {
        try {
            if (editingId) {
                await FreezeWindowService.update(editingId, formData);
            } else {
                await FreezeWindowService.create(formData);
            }
            fetchWindows();
            setOpenModal(false);
        } catch (error) {
            alert(error.response?.data?.message || 'Erro ao salvar.');
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Excluir esta janela?')) {
            try {
                await FreezeWindowService.delete(id);
                fetchWindows();
            } catch (error) {
                alert('Erro ao excluir.');
            }
        }
    };

    const getStatus = (w) => {
        const now = new Date();
        const start = new Date(w.startDate);
        const end = new Date(w.endDate);
        if (now < start) return { label: 'Agendado', color: '#f59e0b' };
        if (now > end) return { label: 'Finalizado', color: '#64748b' };
        return { label: 'Ativo', color: '#f43f5e' };
    };

    return (
        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
            <>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography sx={{ fontSize: '24px', fontWeight: 600, color: textPrimary }}>Janelas de Congelamento (Freeze Windows)</Typography>
                    <Button onClick={() => handleOpen()} sx={{
                        padding: '12px 24px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, textTransform: 'none',
                        background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)', color: 'white',
                        boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
                        '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 6px 16px rgba(37, 99, 235, 0.4)' }
                    }} startIcon={<span className="material-icons-round" style={{ fontSize: '18px' }}>add</span>}>
                        Nova Janela
                    </Button>
                </Box>

                <Box sx={{ ...cardStyle, overflow: 'hidden' }}>
                    <Box sx={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr>
                                    <th style={tableHeaderStyle}>Nome</th>
                                    <th style={tableHeaderStyle}>Periodo</th>
                                    <th style={tableHeaderStyle}>Modulos Afetados</th>
                                    <th style={tableHeaderStyle}>Status</th>
                                    <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>Acoes</th>
                                </tr>
                            </thead>
                            <tbody>
                                {windows.length === 0 ? (
                                    <tr><td colSpan={5} style={{ ...tableCellStyle, textAlign: 'center', padding: '60px' }}>
                                        <span className="material-icons-round" style={{ fontSize: '64px', color: textMuted, opacity: 0.5, display: 'block', marginBottom: '16px' }}>lock_clock</span>
                                        <Typography sx={{ color: textMuted, fontSize: '16px' }}>Nenhuma janela de congelamento cadastrada</Typography>
                                    </td></tr>
                                ) : windows.map((w) => {
                                    const status = getStatus(w);
                                    return (
                                        <tr key={w.id} style={{ transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = rowHoverBg} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                                            <td style={tableCellStyle}><strong style={{ color: textPrimary }}>{w.name}</strong></td>
                                            <td style={tableCellStyle}>{new Date(w.startDate).toLocaleDateString('pt-BR')} - {new Date(w.endDate).toLocaleDateString('pt-BR')}</td>
                                            <td style={tableCellStyle}>{w.description || 'GMUD, Contratos'}</td>
                                            <td style={tableCellStyle}>
                                                <span style={{ color: status.color, fontWeight: 500 }}>{status.label}</span>
                                            </td>
                                            <td style={{ ...tableCellStyle, textAlign: 'right' }}>
                                                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                                                    <IconButton onClick={() => handleOpen(w)} sx={actionBtnStyle('edit')}><span className="material-icons-round" style={{ fontSize: '18px' }}>{status.label === 'Finalizado' ? 'visibility' : 'edit'}</span></IconButton>
                                                    <IconButton onClick={() => handleDelete(w.id)} sx={actionBtnStyle('delete')}><span className="material-icons-round" style={{ fontSize: '18px' }}>delete</span></IconButton>
                                                </Box>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </Box>
                </Box>

                <StandardModal
                    open={openModal}
                    onClose={() => setOpenModal(false)}
                    title={editingId ? 'Editar janela' : 'Nova janela de congelamento'}
                    subtitle="Período e módulos afetados"
                    icon="lock_clock"
                    size="form"
                    footer={
                        <>
                            <Button type="button" onClick={() => setOpenModal(false)} sx={{ color: textSecondary }}>
                                Cancelar
                            </Button>
                            <Button
                                type="button"
                                variant="contained"
                                color="primary"
                                onClick={() => void handleSave()}
                                sx={{ textTransform: 'none', fontWeight: 600 }}
                            >
                                Salvar
                            </Button>
                        </>
                    }
                >
                    <Box display="flex" flexDirection="column" gap={2}>
                        <TextField
                            label="Nome do evento"
                            fullWidth
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            sx={inputSx}
                        />
                        <TextField
                            label="Descrição / módulos afetados"
                            fullWidth
                            multiline
                            rows={2}
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            sx={inputSx}
                        />
                        <Box display="flex" gap={2} flexDirection={{ xs: 'column', sm: 'row' }}>
                            <DatePicker
                                label="Data início"
                                value={formData.startDate}
                                onChange={(v) => setFormData({ ...formData, startDate: v })}
                                slotProps={{ textField: { fullWidth: true, sx: inputSx } }}
                            />
                            <DatePicker
                                label="Data fim"
                                value={formData.endDate}
                                onChange={(v) => setFormData({ ...formData, endDate: v })}
                                slotProps={{ textField: { fullWidth: true, sx: inputSx } }}
                            />
                        </Box>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={formData.isActive}
                                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                />
                            }
                            label="Janela ativa"
                            sx={{ color: textSecondary }}
                        />
                    </Box>
                </StandardModal>
            </>
        </LocalizationProvider>
    );
};

export default FreezeWindowsTab;
