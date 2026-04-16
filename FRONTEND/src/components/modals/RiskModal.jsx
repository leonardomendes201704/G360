import { useState, useEffect } from 'react';
import { useSnackbar } from 'notistack';
import { createRisk, updateRisk } from '../../services/project-details.service';
import {
  Box, Typography, TextField, Select, MenuItem, Button, Autocomplete
} from '@mui/material';
import { Bolt, Flag, TrackChanges } from '@mui/icons-material';
import StandardModal from '../common/StandardModal';

const RiskModal = ({ open, onClose, onSave, projectId, riskToEdit, viewMode = false }) => {
  const { enqueueSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    description: '',
    impact: 'MEDIO',
    probability: 'MEDIA',
    status: 'OPEN',
    strategy: '',
    category: 'technical'
  });

  useEffect(() => {
    if (open) {
      if (riskToEdit) {
        setFormData({
          description: riskToEdit.description,
          impact: riskToEdit.impact,
          probability: riskToEdit.probability,
          status: riskToEdit.status,
          strategy: riskToEdit.strategy || '',
          category: riskToEdit.category || 'technical'
        });
      } else {
        setFormData({
          description: '',
          impact: 'MEDIO',
          probability: 'MEDIA',
          status: 'OPEN',
          strategy: '',
          category: 'technical'
        });
      }
    }
  }, [open, riskToEdit]);

  const handleSave = async () => {
    if (!formData.description) return enqueueSnackbar('Descrição é obrigatória', { variant: 'warning' });
    setLoading(true);
    try {
      if (riskToEdit) {
        await updateRisk(projectId, riskToEdit.id, formData);
        enqueueSnackbar('Risco atualizado', { variant: 'success' });
      } else {
        await createRisk(projectId, formData);
        enqueueSnackbar('Risco registrado!', { variant: 'success' });
      }
      if (onSave) onSave();
      onClose();
    } catch (e) {
      enqueueSnackbar('Erro ao salvar.', { variant: 'error' });
    }
    finally {
      setLoading(false);
    }
  };

  return (
    <StandardModal
      open={open}
      onClose={onClose}
      title={viewMode ? 'Visualizar Risco' : (riskToEdit ? 'Editar Risco' : 'Novo Risco')}
      subtitle={viewMode ? 'Detalhes do risco registrado' : 'Registre um risco identificado no projeto'}
      icon="warning"
      size="detail"
      loading={loading}
      footer={
        <>
          <Button variant="outlined" onClick={onClose} disabled={loading} sx={{ textTransform: 'none', fontWeight: 600 }}>
            {viewMode ? 'Fechar' : 'Cancelar'}
          </Button>
          {!viewMode && (
            <Button
              variant="contained"
              color="error"
              onClick={handleSave}
              disabled={loading}
              sx={{ textTransform: 'none', fontWeight: 600 }}
            >
              Salvar
            </Button>
          )}
        </>
      }
      contentSx={{
        px: 3,
        background: 'var(--modal-bg)',
        '&::-webkit-scrollbar': { width: '6px' },
        '&::-webkit-scrollbar-track': { background: 'transparent' },
        '&::-webkit-scrollbar-thumb': { background: 'var(--modal-border-strong)', borderRadius: '3px' },
        '&::-webkit-scrollbar-thumb:hover': { background: 'var(--modal-border-strong)' }
      }}
    >
      <Box>
        {/* Descrição do Risco */}
        <Box sx={{ mb: 2.5 }}>
          <Typography sx={{ color: 'var(--modal-text-secondary)', fontSize: '13px', fontWeight: 500, mb: 1 }}>
            Descrição do Risco <span style={{ color: '#ef4444' }}>*</span>
          </Typography>
          <TextField
            placeholder="Descreva o risco identificado..."
            value={formData.description}
            onChange={e => setFormData({ ...formData, description: e.target.value })}
            multiline
            rows={3}
            fullWidth
            disabled={viewMode}
            sx={{
              '& .MuiOutlinedInput-root': {
                background: 'var(--modal-surface-hover)',
                border: '1px solid var(--modal-border-strong)',
                borderRadius: '10px',
                color: 'var(--modal-text)',
                fontSize: '14px',
                '& fieldset': { border: 'none' },
                '&:hover': { borderColor: 'var(--modal-border-strong)' },
                '&.Mui-focused': {
                  borderColor: '#f43f5e',
                  background: 'rgba(244, 63, 94, 0.05)',
                  boxShadow: '0 0 0 3px rgba(244, 63, 94, 0.1)'
                }
              },
              '& textarea::placeholder': { color: 'var(--modal-text-muted)' }
            }}
          />
        </Box>

        {/* Avaliação do Risco Section */}
        <Box sx={{
          padding: '16px',
          borderRadius: '12px',
          border: '1px solid var(--modal-border-strong)',
          background: 'var(--modal-surface-subtle)',
          mb: 2.5
        }}>
          <Typography sx={{
            color: 'var(--modal-text-muted)',
            fontSize: '11px',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            mb: 1.5
          }}>
            AVALIAÇÃO DO RISCO
          </Typography>

          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            {/* Probabilidade */}
            <Box sx={{ flex: '1 1 150px' }}>
              <Typography sx={{ color: 'var(--modal-text-secondary)', fontSize: '13px', fontWeight: 500, mb: 1 }}>
                Probabilidade
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {['BAIXA', 'MEDIA', 'ALTA', 'CRITICO'].map(p => (
                  <Button
                    key={p}
                    type="button"
                    onClick={() => !viewMode && setFormData({ ...formData, probability: p })}
                    disabled={viewMode}
                    sx={{
                      padding: '8px 14px',
                      border: '1px solid var(--modal-border-strong)',
                      background: formData.probability === p ? '#f43f5e' : 'var(--modal-surface-hover)',
                      color: formData.probability === p ? 'var(--modal-text-strong)' : 'var(--modal-text-muted)',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: 500,
                      textTransform: 'none',
                      minWidth: 'auto',
                      flex: 1,
                      '&:hover': {
                        borderColor: formData.probability === p ? '#dc2626' : 'var(--modal-border-strong)',
                        background: formData.probability === p ? '#dc2626' : 'var(--modal-border-strong)'
                      }
                    }}
                  >
                    {p.charAt(0) + p.slice(1).toLowerCase()}
                  </Button>
                ))}
              </Box>
            </Box>

            {/* Impacto */}
            <Box sx={{ flex: '1 1 150px' }}>
              <Typography sx={{ color: 'var(--modal-text-secondary)', fontSize: '13px', fontWeight: 500, mb: 1 }}>
                Impacto
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {['BAIXO', 'MEDIO', 'ALTO', 'CRITICO'].map(i => (
                  <Button
                    key={i}
                    type="button"
                    onClick={() => !viewMode && setFormData({ ...formData, impact: i })}
                    disabled={viewMode}
                    sx={{
                      padding: '8px 14px',
                      border: '1px solid var(--modal-border-strong)',
                      background: formData.impact === i ? '#f43f5e' : 'var(--modal-surface-hover)',
                      color: formData.impact === i ? 'var(--modal-text-strong)' : 'var(--modal-text-muted)',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: 500,
                      textTransform: 'none',
                      minWidth: 'auto',
                      flex: 1,
                      '&:hover': {
                        borderColor: formData.impact === i ? '#dc2626' : 'var(--modal-border-strong)',
                        background: formData.impact === i ? '#dc2626' : 'var(--modal-border-strong)'
                      }
                    }}
                  >
                    {i.charAt(0) + i.slice(1).toLowerCase()}
                  </Button>
                ))}
              </Box>
            </Box>

            {/* Categoria */}
            <Box sx={{ flex: '1 1 150px' }}>
              <Typography sx={{ color: 'var(--modal-text-secondary)', fontSize: '13px', fontWeight: 500, mb: 1 }}>
                Categoria
              </Typography>
              <Autocomplete
                freeSolo
                value={formData.category}
                onChange={(e, newValue) => setFormData({ ...formData, category: newValue || '' })}
                onInputChange={(e, newInputValue, reason) => {
                  if (reason === 'input') setFormData({ ...formData, category: newInputValue });
                }}
                options={[
                  { value: 'technical', label: '🔧 Técnico' },
                  { value: 'schedule', label: '📅 Cronograma' },
                  { value: 'resource', label: '👥 Recursos' },
                  { value: 'financial', label: '💰 Financeiro' },
                  { value: 'external', label: '🌐 Externo' },
                  { value: 'security', label: '🔒 Segurança' },
                  { value: 'compliance', label: '📋 Compliance' },
                  { value: 'strategic', label: '🎯 Estratégico' },
                ]}
                getOptionLabel={(option) => {
                  if (typeof option === 'string') {
                    const found = [
                      { value: 'technical', label: '🔧 Técnico' },
                      { value: 'schedule', label: '📅 Cronograma' },
                      { value: 'resource', label: '👥 Recursos' },
                      { value: 'financial', label: '💰 Financeiro' },
                      { value: 'external', label: '🌐 Externo' },
                      { value: 'security', label: '🔒 Segurança' },
                      { value: 'compliance', label: '📋 Compliance' },
                      { value: 'strategic', label: '🎯 Estratégico' },
                    ].find(o => o.value === option);
                    return found ? found.label : option;
                  }
                  return option.label || '';
                }}
                isOptionEqualToValue={(option, value) => {
                  const optVal = typeof option === 'string' ? option : option.value;
                  return optVal === value;
                }}
                disabled={viewMode}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="Selecione ou digite..."
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        background: 'var(--modal-surface-hover)',
                        border: '1px solid var(--modal-border-strong)',
                        borderRadius: '10px',
                        color: 'var(--modal-text)',
                        fontSize: '14px',
                        '& fieldset': { border: 'none' },
                        '&:hover': { borderColor: 'var(--modal-border-strong)' },
                        '&.Mui-focused': {
                          borderColor: '#f43f5e',
                          background: 'rgba(244, 63, 94, 0.05)',
                          boxShadow: '0 0 0 3px rgba(244, 63, 94, 0.1)'
                        },
                      },
                      '& input': { color: 'var(--modal-text)' },
                    }}
                  />
                )}
                PaperComponent={({ children }) => (
                  <Box sx={{ background: 'var(--modal-surface)', border: '1px solid var(--modal-border)', borderRadius: '10px', mt: 0.5 }}>{children}</Box>
                )}
                sx={{ '& .MuiAutocomplete-popupIndicator': { color: 'var(--modal-text-muted)' }, '& .MuiAutocomplete-clearIndicator': { color: 'var(--modal-text-muted)' } }}
              />
            </Box>
          </Box>
        </Box>

        {/* Plano de Ação Section */}
        {/* Plano de Ação Section */}
        <Box sx={{
          padding: '24px',
          borderRadius: '16px',
          border: '1px solid rgba(245, 158, 11, 0.2)', // Amber border subtle
          background: 'linear-gradient(180deg, rgba(255, 251, 235, 0.15) 0%, rgba(255, 255, 255, 0) 100%)',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 4px 20px -5px rgba(245, 158, 11, 0.1)'
        }}>
          {/* Background Decor */}
          <Box sx={{
            position: 'absolute',
            top: '-20px',
            right: '-20px',
            width: '120px',
            height: '120px',
            background: 'radial-gradient(circle, rgba(245, 158, 11, 0.15) 0%, rgba(255,255,255,0) 70%)',
            pointerEvents: 'none',
            zIndex: 0
          }} />

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3, position: 'relative', zIndex: 1 }}>
            <Box sx={{
              width: '36px', height: '36px', borderRadius: '10px',
              background: 'var(--modal-bg, #fff)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              boxShadow: '0 2px 4px rgba(245, 158, 11, 0.05)'
            }}>
              <Bolt sx={{ color: '#d97706', fontSize: '20px' }} />
            </Box>
            <Box>
              <Typography sx={{
                color: 'var(--modal-text-secondary, #92400e)',
                fontSize: '13px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                lineHeight: 1
              }}>
                PLANO DE AÇÃO
              </Typography>
              <Typography sx={{ color: 'var(--modal-text-muted, #b45309)', fontSize: '11px', fontWeight: 500, mt: 0.5 }}>
                Estratégia e Monitoramento
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, position: 'relative', zIndex: 1 }}>
            {/* Estratégia de Mitigação */}
            <Box>
              <Typography sx={{ color: 'var(--modal-text-secondary)', fontSize: '13px', fontWeight: 600, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                <TrackChanges sx={{ fontSize: 16, color: 'var(--modal-text-muted)' }} />
                Estratégia de Mitigação
              </Typography>
              <TextField
                placeholder="Descreva detalhadamente as ações para mitigar este risco..."
                value={formData.strategy}
                onChange={e => setFormData({ ...formData, strategy: e.target.value })}
                multiline
                rows={3}
                fullWidth
                disabled={viewMode}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    background: 'var(--modal-bg, #fff)',
                    border: '1px solid var(--modal-border-strong)',
                    borderRadius: '12px',
                    color: 'var(--modal-text)',
                    fontSize: '14px',
                    transition: 'all 0.2s',
                    '& fieldset': { border: 'none' },
                    '&:hover': { borderColor: '#d97706', boxShadow: '0 2px 8px rgba(245, 158, 11, 0.05)' },
                    '&.Mui-focused': {
                      borderColor: '#d97706',
                      background: 'var(--modal-bg, #fff)',
                      boxShadow: '0 0 0 3px rgba(245, 158, 11, 0.15)'
                    }
                  },
                  '& textarea::placeholder': { color: '#94a3b8', fontStyle: 'italic' }
                }}
              />
            </Box>

            {/* Status */}
            <Box>
              <Typography sx={{ color: 'var(--modal-text-secondary)', fontSize: '13px', fontWeight: 600, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Flag sx={{ fontSize: 16, color: 'var(--modal-text-muted)' }} />
                Status do Risco
              </Typography>
              <Select
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value })}
                fullWidth
                disabled={viewMode}
                displayEmpty
                renderValue={(selected) => {
                  const statusConfig = {
                    'OPEN': { label: 'Em Aberto', color: '#ef4444', bg: '#fee2e2' },
                    'MONITORING': { label: 'Monitorando', color: '#d97706', bg: '#fef3c7' },
                    'MITIGATED': { label: 'Mitigado / Controlado', color: '#16a34a', bg: '#dcfce7' },
                    'CLOSED': { label: 'Fechado', color: '#475569', bg: '#f1f5f9' }
                  };
                  const conf = statusConfig[selected] || statusConfig['OPEN'];
                  return (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', background: conf.color, boxShadow: `0 0 0 2px ${conf.bg}` }} />
                      <Typography sx={{ fontSize: '14px', fontWeight: 500, color: 'var(--modal-text)' }}>{conf.label}</Typography>
                    </Box>
                  );
                }}
                sx={{
                  background: 'var(--modal-bg, #fff)',
                  border: '1px solid var(--modal-border-strong)',
                  borderRadius: '12px',
                  '& fieldset': { border: 'none' },
                  '&:hover': { borderColor: 'var(--modal-border-strong)' },
                  '&.Mui-focused': {
                    borderColor: '#3b82f6',
                    boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)'
                  }
                }}
              >
                <MenuItem value="OPEN">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }} />
                    Em Aberto
                  </Box>
                </MenuItem>
                <MenuItem value="MONITORING">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', background: '#d97706' }} />
                    Monitorando
                  </Box>
                </MenuItem>
                <MenuItem value="MITIGATED">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', background: '#16a34a' }} />
                    Mitigado / Controlado
                  </Box>
                </MenuItem>
                <MenuItem value="CLOSED">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', background: '#475569' }} />
                    Fechado
                  </Box>
                </MenuItem>
              </Select>
            </Box>
          </Box>
        </Box>
      </Box>
    </StandardModal>
  );
};

export default RiskModal;
