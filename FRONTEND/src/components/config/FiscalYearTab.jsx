import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Box, Typography, Button } from '@mui/material';
import { useSnackbar } from 'notistack';

import FiscalYearModal from '../modals/FiscalYearModal';
import fiscalYearService from '../../services/fiscal-year.service';
import ConfirmDialog from '../common/ConfirmDialog';
import DataListTable from '../common/DataListTable';
import { getErrorMessage } from '../../utils/errorUtils';
import { useOrgThemeStyles } from '../../pages/config/useOrgThemeStyles';
import { getFiscalYearListColumns } from './fiscalYearListColumns';
import { sortFiscalYearRows } from './fiscalYearListSort';

const FiscalYearTab = () => {
  const { textPrimary, textMuted, cardStyle, actionBtnStyle } = useOrgThemeStyles();
  const [years, setYears] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const { enqueueSnackbar } = useSnackbar();

  const loadData = async () => {
    try {
      const data = await fiscalYearService.getAll();
      setYears(Array.isArray(data) ? data : []);
    } catch (error) {
      enqueueSnackbar(getErrorMessage(error, 'Erro ao carregar anos fiscais.'), { variant: 'error' });
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleEdit = useCallback((item) => {
    setEditData(item);
    setModalOpen(true);
  }, []);
  const handleAdd = () => {
    setEditData(null);
    setModalOpen(true);
  };
  const handleDeleteClick = useCallback((id) => {
    setDeleteId(id);
    setConfirmOpen(true);
  }, []);

  const handleConfirmDelete = async () => {
    if (!deleteId) return;
    try {
      await fiscalYearService.delete(deleteId);
      loadData();
      enqueueSnackbar('Ano fiscal excluído com sucesso.', { variant: 'success' });
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
        enqueueSnackbar('Ano fiscal atualizado.', { variant: 'success' });
      } else {
        await fiscalYearService.create(data);
        enqueueSnackbar('Ano fiscal criado.', { variant: 'success' });
      }
      setModalOpen(false);
      loadData();
    } catch (error) {
      enqueueSnackbar(getErrorMessage(error, 'Erro ao salvar ano fiscal.'), { variant: 'error' });
    }
  };

  const fiscalColumns = useMemo(
    () =>
      getFiscalYearListColumns({
        textPrimary,
        actionBtnStyle,
        onEdit: handleEdit,
        onDelete: handleDeleteClick,
      }),
    [textPrimary, actionBtnStyle, handleEdit, handleDeleteClick]
  );

  const emptyContent = useMemo(
    () => (
      <Box sx={{ textAlign: 'center', py: 4, px: 2 }}>
        <span
          className="material-icons-round"
          style={{ fontSize: '64px', color: textMuted, opacity: 0.5, display: 'block', marginBottom: '16px' }}
        >
          calendar_today
        </span>
        <Typography sx={{ color: textMuted, fontSize: '16px' }}>Nenhum ano fiscal cadastrado</Typography>
      </Box>
    ),
    [textMuted]
  );

  return (
    <>
      <DataListTable
        density="compact"
        shell={{
          title: 'Configuração de ano fiscal',
          titleIcon: 'calendar_today',
          accentColor: '#2563eb',
          count: years.length,
          sx: { ...cardStyle, mb: 2 },
          toolbar: (
            <Button
              data-testid="fiscal-year-add"
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
                flexShrink: 0,
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: '0 6px 16px rgba(37, 99, 235, 0.4)',
                },
              }}
              startIcon={<span className="material-icons-round" style={{ fontSize: '16px' }}>add</span>}
            >
              Novo ano fiscal
            </Button>
          ),
          tableContainerSx: {
            borderRadius: 0,
            boxShadow: 'none',
          },
        }}
        columns={fiscalColumns}
        rows={years}
        sortRows={sortFiscalYearRows}
        defaultOrderBy="year"
        defaultOrder="desc"
        getDefaultOrderForColumn={(id) => (id === 'year' || id === 'startDate' || id === 'endDate' ? 'desc' : 'asc')}
        emptyMessage="Nenhum ano fiscal cadastrado."
        emptyContent={emptyContent}
        dataTestidTable="tabela-organizacao-ano-fiscal"
        rowsPerPageOptions={[5, 10, 25, 50]}
        rowsPerPageDefault={10}
      />

      {modalOpen && (
        <FiscalYearModal open={modalOpen} onClose={() => setModalOpen(false)} onSave={handleSave} fiscalYear={editData} />
      )}
      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Excluir ano fiscal"
        content="Tem certeza? Excluir um ano fiscal pode impactar orçamentos vinculados."
      />
    </>
  );
};

export default FiscalYearTab;
