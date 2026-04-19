import React, { useState, useEffect, useMemo, useCallback, useContext } from 'react';
import { Box, Button, TextField, Switch, FormControlLabel, Typography } from '@mui/material';
import StandardModal from '../common/StandardModal';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import ptBR from 'date-fns/locale/pt-BR';
import FreezeWindowService from '../../services/freeze-window.service';
import { ThemeContext } from '../../contexts/ThemeContext';
import DataListTable from '../common/DataListTable';
import { useOrgThemeStyles } from '../../pages/config/useOrgThemeStyles';
import { getFreezeWindowListColumns } from '../config/freezeWindowListColumns';
import { sortFreezeWindowRows } from '../config/freezeWindowListSort';

const FreezeWindowsTab = () => {
  const { mode } = useContext(ThemeContext);
  const isDark = mode === 'dark';
  const { textPrimary, textSecondary, textMuted, cardStyle, actionBtnStyle } = useOrgThemeStyles();
  const inputBg = isDark ? '#1c2632' : '#ffffff';
  const inputBorder = isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid rgba(15, 23, 42, 0.12)';

  const inputSx = {
    '& .MuiOutlinedInput-root': {
      background: inputBg,
      color: textPrimary,
      '& fieldset': { borderColor: inputBorder },
    },
    '& .MuiInputLabel-root': { color: textMuted },
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

  useEffect(() => {
    fetchWindows();
  }, []);

  const handleOpen = useCallback((item = null) => {
    if (item) {
      setEditingId(item.id);
      setFormData({
        name: item.name,
        description: item.description || '',
        startDate: new Date(item.startDate),
        endDate: new Date(item.endDate),
        isActive: item.isActive,
      });
    } else {
      setEditingId(null);
      setFormData({ name: '', description: '', startDate: null, endDate: null, isActive: true });
    }
    setOpenModal(true);
  }, []);

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

  const handleDelete = useCallback((id) => {
    if (window.confirm('Excluir esta janela?')) {
      void (async () => {
        try {
          await FreezeWindowService.delete(id);
          fetchWindows();
        } catch (error) {
          alert('Erro ao excluir.');
        }
      })();
    }
  }, []);

  const freezeColumns = useMemo(
    () =>
      getFreezeWindowListColumns({
        textPrimary,
        actionBtnStyle,
        onOpen: handleOpen,
        onDelete: handleDelete,
      }),
    [textPrimary, actionBtnStyle, handleOpen, handleDelete]
  );

  const emptyContent = useMemo(
    () => (
      <Box sx={{ textAlign: 'center', py: 4, px: 2 }}>
        <span
          className="material-icons-round"
          style={{ fontSize: '64px', color: textMuted, opacity: 0.5, display: 'block', marginBottom: '16px' }}
        >
          lock_clock
        </span>
        <Typography sx={{ color: textMuted, fontSize: '16px' }}>Nenhuma janela de congelamento cadastrada</Typography>
      </Box>
    ),
    [textMuted]
  );

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
      <>
        <DataListTable
          density="compact"
          loading={loading}
          shell={{
            title: 'Janelas de congelamento (freeze windows)',
            titleIcon: 'lock_clock',
            accentColor: '#2563eb',
            count: windows.length,
            sx: { ...cardStyle, mb: 2 },
            toolbar: (
              <Button
                onClick={() => handleOpen()}
                sx={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  textTransform: 'none',
                  background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
                  color: 'white',
                  boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
                  flexShrink: 0,
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 6px 16px rgba(37, 99, 235, 0.4)',
                  },
                }}
                startIcon={<span className="material-icons-round" style={{ fontSize: '16px' }}>add</span>}
              >
                Nova janela
              </Button>
            ),
            tableContainerSx: {
              borderRadius: 0,
              boxShadow: 'none',
            },
          }}
          columns={freezeColumns}
          rows={windows}
          sortRows={sortFreezeWindowRows}
          defaultOrderBy="period"
          defaultOrder="desc"
          emptyMessage="Nenhuma janela de congelamento cadastrada."
          emptyContent={emptyContent}
          dataTestidTable="tabela-organizacao-freeze-windows"
          rowsPerPageOptions={[5, 10, 25, 50]}
          rowsPerPageDefault={10}
        />

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
              <Button type="button" variant="contained" color="primary" onClick={() => void handleSave()} sx={{ textTransform: 'none', fontWeight: 600 }}>
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
              control={<Switch checked={formData.isActive} onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })} />}
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
