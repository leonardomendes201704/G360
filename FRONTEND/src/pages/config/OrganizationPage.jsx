import React, { useState, useEffect, useContext, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Box, Typography, Button } from '@mui/material';
import { useSnackbar } from 'notistack';

import DepartmentModal from '../../components/modals/DepartmentModal';
import CostCenterModal from '../../components/modals/CostCenterModal';
import IntegrationsTab from '../../components/config/IntegrationsTab';
import UsersTab from '../../components/config/UsersTab';
import RolesTab from '../../components/config/RolesTab';
import TenantsTab from '../../components/config/TenantsTab';
import FiscalYearTab from '../../components/config/FiscalYearTab';
import FreezeWindowsTab from '../../components/admin/FreezeWindowsTab';
import CabMembersTab from '../../components/admin/CabMembersTab';
import ApprovalTiersTab from '../../components/config/ApprovalTiersTab';
import ServiceDeskConfigSection from '../../components/config/ServiceDeskConfigSection';

import ConfirmDialog from '../../components/common/ConfirmDialog';
import PageTitleCard from '../../components/common/PageTitleCard';
import DataListTable from '../../components/common/DataListTable';

import departmentService from '../../services/department.service';
import costCenterService from '../../services/cost-center.service';
import { getErrorMessage } from '../../utils/errorUtils';
import { AuthContext } from '../../contexts/AuthContext';
import './OrganizationPage.css';
import { useOrgThemeStyles } from './useOrgThemeStyles';
import { getDepartmentListColumns } from './departmentListColumns';
import { sortDepartmentRows } from './departmentListSort';
import { getCostCenterListColumns } from './costCenterListColumns';
import { sortCostCenterRows } from './costCenterListSort';

// Aba de Diretorias
const DepartmentsTab = () => {
  const { textPrimary, textMuted, cardStyle, actionBtnStyle } = useOrgThemeStyles();
  const [departments, setDepartments] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const { enqueueSnackbar } = useSnackbar();

  const loadData = async () => {
    try {
      const data = await departmentService.getAll();
      setDepartments(data);
    } catch (error) {
      enqueueSnackbar(getErrorMessage(error, 'Erro ao carregar departamentos.'), { variant: 'error' });
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleEdit = useCallback((dept) => {
    setEditData(dept);
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
      await departmentService.delete(deleteId);
      loadData();
      enqueueSnackbar('Diretoria excluida com sucesso.', { variant: 'success' });
      setConfirmOpen(false);
      setDeleteId(null);
    } catch (error) {
      enqueueSnackbar(getErrorMessage(error, 'Erro ao excluir diretoria.'), { variant: 'error' });
    }
  };

  const departmentColumns = useMemo(
    () =>
      getDepartmentListColumns({
        textPrimary,
        actionBtnStyle,
        onEdit: handleEdit,
        onDelete: handleDeleteClick,
      }),
    [textPrimary, actionBtnStyle, handleEdit, handleDeleteClick]
  );

  const departmentEmptyContent = useMemo(
    () => (
      <Box sx={{ textAlign: 'center', py: 4, px: 2 }}>
        <span
          className="material-icons-round"
          style={{ fontSize: '64px', color: textMuted, opacity: 0.5, display: 'block', marginBottom: '16px' }}
        >
          corporate_fare
        </span>
        <Typography sx={{ color: textMuted, fontSize: '16px', mb: 1 }}>Nenhuma diretoria cadastrada</Typography>
        <Typography sx={{ color: textMuted, fontSize: '14px' }}>Clique em &quot;Nova Diretoria&quot; para começar</Typography>
      </Box>
    ),
    [textMuted]
  );

  return (
    <>
      <DataListTable
        density="compact"
        shell={{
          title: 'Diretorias & Departamentos',
          titleIcon: 'corporate_fare',
          accentColor: '#2563eb',
          count: departments.length,
          sx: { ...cardStyle, mb: 2 },
          toolbar: (
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
                flexShrink: 0,
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: '0 6px 16px rgba(37, 99, 235, 0.4)',
                },
              }}
              startIcon={<span className="material-icons-round" style={{ fontSize: '16px' }}>add</span>}
            >
              Nova Diretoria
            </Button>
          ),
          tableContainerSx: {
            borderRadius: 0,
            boxShadow: 'none',
          },
        }}
        columns={departmentColumns}
        rows={departments}
        sortRows={sortDepartmentRows}
        defaultOrderBy="name"
        defaultOrder="asc"
        emptyMessage="Nenhuma diretoria cadastrada."
        emptyContent={departmentEmptyContent}
        dataTestidTable="tabela-organizacao-diretorias"
        rowsPerPageOptions={[5, 10, 25, 50]}
        rowsPerPageDefault={10}
      />
      <DepartmentModal open={modalOpen} onClose={() => setModalOpen(false)} onSuccess={loadData} editData={editData} />
      <ConfirmDialog open={confirmOpen} onClose={() => setConfirmOpen(false)} onConfirm={handleConfirmDelete} title="Excluir Diretoria" content="Tem certeza que deseja excluir esta diretoria?" />
    </>
  );
};

// Aba de Centros de Custo
const CostCentersTab = () => {
  const { textPrimary, textMuted, cardStyle, actionBtnStyle } = useOrgThemeStyles();
  const [ccs, setCcs] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const { enqueueSnackbar } = useSnackbar();

  const loadData = async () => {
    try {
      const data = await costCenterService.getAll();
      setCcs(data);
    } catch (error) {
      enqueueSnackbar(getErrorMessage(error, 'Erro ao carregar centros de custo.'), { variant: 'error' });
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
      await costCenterService.delete(deleteId);
      loadData();
      enqueueSnackbar('Centro de Custo excluido.', { variant: 'success' });
      setConfirmOpen(false);
      setDeleteId(null);
    } catch (error) {
      enqueueSnackbar(getErrorMessage(error, 'Erro ao excluir.'), { variant: 'error' });
    }
  };

  const costCenterColumns = useMemo(
    () =>
      getCostCenterListColumns({
        textPrimary,
        actionBtnStyle,
        onEdit: handleEdit,
        onDelete: handleDeleteClick,
      }),
    [textPrimary, actionBtnStyle, handleEdit, handleDeleteClick]
  );

  const costCenterEmptyContent = useMemo(
    () => (
      <Box sx={{ textAlign: 'center', py: 4, px: 2 }}>
        <span
          className="material-icons-round"
          style={{ fontSize: '64px', color: textMuted, opacity: 0.5, display: 'block', marginBottom: '16px' }}
        >
          account_balance
        </span>
        <Typography sx={{ color: textMuted, fontSize: '16px', mb: 1 }}>Nenhum centro de custo cadastrado</Typography>
        <Typography sx={{ color: textMuted, fontSize: '14px' }}>Clique em &quot;Novo Centro de Custo&quot; para começar</Typography>
      </Box>
    ),
    [textMuted]
  );

  return (
    <>
      <DataListTable
        density="compact"
        shell={{
          title: 'Centros de Custo',
          titleIcon: 'account_balance',
          accentColor: '#2563eb',
          count: ccs.length,
          sx: { ...cardStyle, mb: 2 },
          toolbar: (
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
                flexShrink: 0,
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: '0 6px 16px rgba(37, 99, 235, 0.4)',
                },
              }}
              startIcon={<span className="material-icons-round" style={{ fontSize: '16px' }}>add</span>}
            >
              Novo Centro de Custo
            </Button>
          ),
          tableContainerSx: {
            borderRadius: 0,
            boxShadow: 'none',
          },
        }}
        columns={costCenterColumns}
        rows={ccs}
        sortRows={sortCostCenterRows}
        defaultOrderBy="name"
        defaultOrder="asc"
        emptyMessage="Nenhum centro de custo cadastrado."
        emptyContent={costCenterEmptyContent}
        dataTestidTable="tabela-organizacao-centros-custo"
        rowsPerPageOptions={[5, 10, 25, 50]}
        rowsPerPageDefault={10}
      />
      <CostCenterModal open={modalOpen} onClose={() => setModalOpen(false)} onSuccess={loadData} editData={editData} />
      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Excluir Centro de Custo"
        content="Tem certeza que deseja excluir este centro de custo?"
      />
    </>
  );
};

// Pagina Principal
const OrganizationPage = () => {
  const { user } = useContext(AuthContext);
  const [searchParams, setSearchParams] = useSearchParams();
  
  const roles = user?.roles || (user?.role ? [user.role] : []);
  const isGlobalSuperAdmin = roles.some(r => r.name === 'Super Admin') && user?.schema === 'public';
  
  const [activeTab, setActiveTab] = useState(isGlobalSuperAdmin ? 'tenants' : 'diretorias');

  const tabs = isGlobalSuperAdmin ? [
    { id: 'tenants', label: 'Gestao de Empresas', icon: 'domain' }
  ] : [
    { id: 'diretorias', label: 'Diretorias', icon: 'corporate_fare' },
    { id: 'centros-custo', label: 'Centros de Custo', icon: 'account_balance' },
    { id: 'usuarios', label: 'Usuarios', icon: 'people' },
    { id: 'perfis', label: 'Perfis de Acesso', icon: 'shield' },
    { id: 'fiscal', label: 'Ano Fiscal', icon: 'calendar_today' },
    { id: 'integracoes', label: 'Integracoes', icon: 'sync' },
    { id: 'freeze', label: 'Freeze Windows', icon: 'lock_clock' },
    { id: 'cab', label: 'Membros CAB', icon: 'groups' },
    { id: 'alcadas', label: 'Alçadas de aprovação', icon: 'rule' },
    { id: 'servicedesk', label: 'Service Desk', icon: 'support_agent' },
  ];

  useEffect(() => {
    if (isGlobalSuperAdmin) return;
    const t = searchParams.get('tab');
    if (t === 'servicedesk') setActiveTab('servicedesk');
  }, [searchParams, isGlobalSuperAdmin]);

  const handleOrgTabClick = useCallback((id) => {
    setActiveTab(id);
    if (isGlobalSuperAdmin) return;
    if (id === 'servicedesk') {
      setSearchParams((prev) => {
        const n = new URLSearchParams(prev);
        n.set('tab', 'servicedesk');
        if (!n.get('sd')) n.set('sd', 'expediente');
        return n;
      }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  }, [isGlobalSuperAdmin, setSearchParams]);

  const renderContent = () => {
    if (isGlobalSuperAdmin && activeTab === 'tenants') return <TenantsTab />;
    switch (activeTab) {
      case 'diretorias': return <DepartmentsTab />;
      case 'centros-custo': return <CostCentersTab />;
      case 'usuarios': return <UsersTab />;
      case 'perfis': return <RolesTab />;
      case 'fiscal': return <FiscalYearTab />;
      case 'integracoes': return <IntegrationsTab />;
      case 'freeze': return <FreezeWindowsTab />;
      case 'cab': return <CabMembersTab />;
      case 'alcadas': return <ApprovalTiersTab />;
      case 'servicedesk': return <ServiceDeskConfigSection />;

      default: return <DepartmentsTab />;
    }
  };

  return (
    <div className="org-page-container">
      <PageTitleCard
        iconName="settings"
        iconColor="#3b82f6"
        title="Estrutura Organizacional & Configurações"
        subtitle="Departamentos, custos, usuários, integrações e Service Desk"
        mb={3}
      />

      {/* Tabs Container */}
      <div className="org-tabs-container">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            data-testid={`org-tab-${tab.id}`}
            onClick={() => handleOrgTabClick(tab.id)}
            className={`org-tab-button ${activeTab === tab.id ? 'active' : 'inactive'}`}
          >
            <span className="material-icons-round" style={{ fontSize: '16px' }}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content - Rendered directly, no wrapper card */}
      <div className="org-content-wrapper">
        {renderContent()}
      </div>
    </div>
  );
};

export default OrganizationPage;

