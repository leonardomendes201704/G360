import React, { useState, useEffect, useContext } from 'react';
import { Box, Typography, Button, IconButton } from '@mui/material';
import { useSnackbar } from 'notistack';

import FiscalYearModal from '../modals/FiscalYearModal';
import fiscalYearService from '../../services/fiscal-year.service';
import ConfirmDialog from '../common/ConfirmDialog';
import { getErrorMessage } from '../../utils/errorUtils';
import { ThemeContext } from '../../contexts/ThemeContext';

const FiscalYearTab = () => {
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
    const formatDateUTC = (dateString) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        const userTimezoneOffset = date.getTimezoneOffset() * 60000;
        const adjustedDate = new Date(date.getTime() + userTimezoneOffset);
        return adjustedDate.toLocaleDateString('pt-BR');
    };

    const [years, setYears] = useState([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [editData, setEditData] = useState(null);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [deleteId, setDeleteId] = useState(null);
    const { enqueueSnackbar } = useSnackbar();

    const loadData = async () => {
        try {
            const data = await fiscalYearService.getAll();
            const sorted = data.sort((a, b) => b.year - a.year);
            setYears(sorted);
        } catch (error) {
            enqueueSnackbar(getErrorMessage(error, 'Erro ao carregar anos fiscais.'), { variant: 'error' });
        }
    };

    useEffect(() => { loadData(); }, []);

    const handleEdit = (item) => { setEditData(item); setModalOpen(true); };
    const handleAdd = () => { setEditData(null); setModalOpen(true); };
    const handleDeleteClick = (id) => { setDeleteId(id); setConfirmOpen(true); };

    const handleConfirmDelete = async () => {
        if (!deleteId) return;
        try {
            await fiscalYearService.delete(deleteId);
            loadData();
            enqueueSnackbar('Ano Fiscal excluido com sucesso.', { variant: 'success' });
            setConfirmOpen(false);
            setDeleteId(null);
        } catch (error) {
            enqueueSnackbar(getErrorMessage(error, 'Erro ao excluir ano fiscal.'), { variant: 'error' });
        }
    };

    const handleSave = async (data) => {
        try {
            if (editData) {
                await fiscalYearService.update(editData.id, data);
                enqueueSnackbar('Ano Fiscal atualizado.', { variant: 'success' });
            } else {
                await fiscalYearService.create(data);
                enqueueSnackbar('Ano Fiscal criado.', { variant: 'success' });
            }
            setModalOpen(false);
            loadData();
        } catch (error) {
            enqueueSnackbar(getErrorMessage(error, 'Erro ao salvar ano fiscal.'), { variant: 'error' });
        }
    };

    return (
        <>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography sx={{ fontSize: '24px', fontWeight: 600, color: textPrimary }}>Configuracao de Ano Fiscal</Typography>
                <Button
                    data-testid="fiscal-year-add"
                    onClick={handleAdd}
                    sx={{
                    padding: '12px 24px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, textTransform: 'none',
                    background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)', color: 'white',
                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
                    '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 6px 16px rgba(37, 99, 235, 0.4)' }
                }} startIcon={<span className="material-icons-round" style={{ fontSize: '18px' }}>add</span>}>
                    Novo Ano Fiscal
                </Button>
            </Box>

            <Box sx={{ ...cardStyle, overflow: 'hidden' }}>
                <Box sx={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr>
                                <th style={tableHeaderStyle}>Ano</th>
                                <th style={tableHeaderStyle}>Inicio</th>
                                <th style={tableHeaderStyle}>Fim</th>
                                <th style={tableHeaderStyle}>Status</th>
                                <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>Acoes</th>
                            </tr>
                        </thead>
                        <tbody>
                            {years.length === 0 ? (
                                <tr><td colSpan={5} style={{ ...tableCellStyle, textAlign: 'center', padding: '60px' }}>
                                    <span className="material-icons-round" style={{ fontSize: '64px', color: textMuted, opacity: 0.5, display: 'block', marginBottom: '16px' }}>calendar_today</span>
                                    <Typography sx={{ color: textMuted, fontSize: '16px' }}>Nenhum ano fiscal cadastrado</Typography>
                                </td></tr>
                            ) : years.map((fy) => (
                                <tr key={fy.id} style={{ transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = rowHoverBg} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                                    <td style={tableCellStyle}><strong style={{ color: textPrimary }}>{fy.year}</strong></td>
                                    <td style={tableCellStyle}>{formatDateUTC(fy.startDate)}</td>
                                    <td style={tableCellStyle}>{formatDateUTC(fy.endDate)}</td>
                                    <td style={tableCellStyle}>
                                        <span style={{
                                            padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
                                            background: fy.isClosed ? 'rgba(100, 116, 139, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                                            color: fy.isClosed ? '#64748b' : '#10b981'
                                        }}>{fy.isClosed ? 'Fechado' : 'Aberto'}</span>
                                    </td>
                                    <td style={{ ...tableCellStyle, textAlign: 'right' }}>
                                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                                            <IconButton onClick={() => handleEdit(fy)} sx={actionBtnStyle('edit')}><span className="material-icons-round" style={{ fontSize: '18px' }}>edit</span></IconButton>
                                            <IconButton onClick={() => handleDeleteClick(fy.id)} sx={actionBtnStyle('delete')}><span className="material-icons-round" style={{ fontSize: '18px' }}>delete</span></IconButton>
                                        </Box>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </Box>
            </Box>

            {modalOpen && <FiscalYearModal open={modalOpen} onClose={() => setModalOpen(false)} onSave={handleSave} fiscalYear={editData} />}
            <ConfirmDialog open={confirmOpen} onClose={() => setConfirmOpen(false)} onConfirm={handleConfirmDelete} title="Excluir Ano Fiscal" content="Tem certeza? Excluir um ano fiscal pode impactar orcamentos vinculados." />
        </>
    );
};

export default FiscalYearTab;
