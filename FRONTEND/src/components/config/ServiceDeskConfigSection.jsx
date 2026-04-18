import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Box, Button, Typography } from '@mui/material';
import { useContext } from 'react';
import { ThemeContext } from '../../contexts/ThemeContext';
import { ServiceDeskSettingsPanel } from '../../pages/servicedesk/ServiceDeskSettings';
import { CatalogAdminPanel } from '../../pages/servicedesk/CatalogAdmin';

/**
 * Expediente, feriados, grupos e catálogo — usado apenas em Configurações (/config/organization).
 */
const ServiceDeskConfigSection = () => {
  const { mode } = useContext(ThemeContext);
  const isDark = mode === 'dark';
  const textSecondary = isDark ? '#94a3b8' : '#475569';
  const textMuted = isDark ? '#64748b' : '#64748b';
  const inputBorder = isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(15, 23, 42, 0.15)';
  const hoverBg = isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.01)';

  const [searchParams, setSearchParams] = useSearchParams();
  const sdSection = searchParams.get('sd') === 'catalog' ? 'catalog' : 'expediente';

  const setSection = (section) => {
    setSearchParams((prev) => {
      const n = new URLSearchParams(prev);
      n.set('tab', 'servicedesk');
      n.set('sd', section);
      return n;
    }, { replace: true });
  };

  const subBtn = (active) => ({
    textTransform: 'none',
    borderRadius: '8px',
    fontWeight: 600,
    fontSize: '13px',
    ...(active
      ? {
          background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
          color: '#fff',
          boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
          '&:hover': { background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)' },
        }
      : {
          borderColor: inputBorder,
          color: textSecondary,
          '&:hover': { borderColor: '#2563eb', background: hoverBg },
        }),
  });

  return (
    <Box>
      <Box sx={{ mb: 2 }}>
        <Typography sx={{ fontSize: '18px', fontWeight: 700, color: isDark ? '#f1f5f9' : '#0f172a', mb: 0.5 }}>
          Service Desk
        </Typography>
        <Typography sx={{ fontSize: '14px', color: textMuted, lineHeight: 1.5 }}>
          Horário operacional, feriados, grupos de atribuição e catálogo do portal.
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', gap: 1, mb: 2.5, flexWrap: 'wrap' }}>
        <Button
          variant={sdSection === 'expediente' ? 'contained' : 'outlined'}
          onClick={() => setSection('expediente')}
          sx={subBtn(sdSection === 'expediente')}
        >
          Horário operacional e grupos
        </Button>
        <Button
          variant={sdSection === 'catalog' ? 'contained' : 'outlined'}
          onClick={() => setSection('catalog')}
          sx={subBtn(sdSection === 'catalog')}
        >
          Catálogo
        </Button>
      </Box>
      {sdSection === 'expediente' ? <ServiceDeskSettingsPanel embedded /> : <CatalogAdminPanel embedded />}
    </Box>
  );
};

export default ServiceDeskConfigSection;
