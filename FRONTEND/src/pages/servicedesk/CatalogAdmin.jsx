import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import {
  Box, Typography, Paper, IconButton, Button,
  TextField, MenuItem, Tabs, Tab
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import DynamicFormIcon from '@mui/icons-material/DynamicForm';
import serviceCatalogService from '../../services/service-catalog.service';
import slaPolicyService from '../../services/sla-policy.service';
import StandardModal from '../../components/common/StandardModal';
import DataListTable from '../../components/common/DataListTable';
import { getCatalogServiceListColumns } from './catalogServiceListColumns';
import { sortCatalogServiceRows } from './catalogServiceListSort';
import { getCatalogCategoryListColumns } from './catalogCategoryListColumns';
import { sortCatalogCategoryRows } from './catalogCategoryListSort';
import { getCatalogSlaListColumns } from './catalogSlaListColumns';
import { sortCatalogSlaRows } from './catalogSlaListSort';

export const CatalogAdminPanel = ({ embedded = false }) => {
  const [categories, setCategories] = useState([]);
  const [services, setServices] = useState([]);
  const [slas, setSlas] = useState([]);
  const [activeTab, setActiveTab] = useState(0);
  
  // Modals
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [svcModalOpen, setSvcModalOpen] = useState(false);
  const [slaModalOpen, setSlaModalOpen] = useState(false);
  
  // Forms
  const [editingCat, setEditingCat] = useState(null);
  const [catName, setCatName] = useState('');
  
  const [editingSvc, setEditingSvc] = useState(null);
  const [svcName, setSvcName] = useState('');
  const [svcDesc, setSvcDesc] = useState('');
  const [svcCatId, setSvcCatId] = useState('');
  const [svcSlaId, setSvcSlaId] = useState('');
  
  const [editingSla, setEditingSla] = useState(null);
  const [slaData, setSlaData] = useState({ name: '', description: '', responseHours: 1, resolveHours: 24 });

  // Dynamic Form Builder
  const [fbModalOpen, setFbModalOpen] = useState(false);
  const [fbService, setFbService] = useState(null);
  const [fbFields, setFbFields] = useState([]);
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldType, setNewFieldType] = useState('text');
  const [newFieldRequired, setNewFieldRequired] = useState(false);
  const [newFieldOptions, setNewFieldOptions] = useState(''); // comma separated for selects

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const cats = await serviceCatalogService.getCategories();
      const slasList = await slaPolicyService.getAll();
      const svcs = await serviceCatalogService.getAll({});
      setCategories(cats);
      setSlas(slasList);
      setServices(svcs);
    } catch (err) {
      console.error(err);
    }
  };

  // --- Category Actions ---
  const openCatModal = (cat = null) => {
    setEditingCat(cat);
    setCatName(cat ? cat.name : '');
    setCatModalOpen(true);
  };

  const handleSaveCategory = async () => {
    try {
      if (editingCat) {
        await serviceCatalogService.updateCategory(editingCat.id, { name: catName });
      } else {
        await serviceCatalogService.createCategory({ name: catName });
      }
      setCatModalOpen(false);
      fetchData();
    } catch (err) {
      alert('Erro ao salvar categoria: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleDeleteCategory = async (id) => {
    if(!window.confirm('Excluir categoria?')) return;
    try {
      await serviceCatalogService.deleteCategory(id);
      fetchData();
    } catch(err) { alert('Erro ao excluir: ' + (err.response?.data?.error || err.message)); }
  };

  // --- Service Actions ---
  const openSvcModal = (svc = null) => {
    setEditingSvc(svc);
    setSvcName(svc ? svc.name : '');
    setSvcDesc(svc ? svc.description : '');
    setSvcCatId(svc ? svc.categoryId : '');
    setSvcSlaId(svc ? (svc.slaPolicyId || '') : '');
    setSvcModalOpen(true);
  };

  const handleSaveService = async () => {
    try {
      const payload = { name: svcName, description: svcDesc, categoryId: svcCatId, slaPolicyId: svcSlaId || null };
      if (editingSvc) {
        await serviceCatalogService.update(editingSvc.id, payload);
      } else {
        await serviceCatalogService.create(payload);
      }
      setSvcModalOpen(false);
      fetchData();
    } catch (err) {
      alert('Erro ao salvar serviço: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleDeleteService = async (id) => {
    if(!window.confirm('Excluir serviço?')) return;
    try {
      await serviceCatalogService.delete(id);
      fetchData();
    } catch(err) { alert('Erro ao excluir serviço: ' + (err.response?.data?.error || err.message)); }
  };

  // --- Form Builder Actions ---
  const openFormBuilder = (svc) => {
    setFbService(svc);
    // Parse existing schema or start empty
    let parsedSchema = [];
    if (svc.formSchema) {
      try {
        parsedSchema = typeof svc.formSchema === 'string' ? JSON.parse(svc.formSchema) : svc.formSchema;
        if (!Array.isArray(parsedSchema)) parsedSchema = [];
      } catch(e) { parsedSchema = []; }
    }
    setFbFields(parsedSchema);
    
    // Reset inputs
    setNewFieldLabel('');
    setNewFieldType('text');
    setNewFieldRequired(false);
    setNewFieldOptions('');
    setFbModalOpen(true);
  };

  const addFbField = () => {
    if (!newFieldLabel.trim()) return alert('O título do campo é obrigatório');
    
    const newField = {
      id: `field_${Date.now()}`,
      label: newFieldLabel.trim(),
      type: newFieldType,
      required: newFieldRequired,
      options: newFieldType === 'select' ? newFieldOptions.split(',').map(o => o.trim()).filter(o => o) : []
    };

    setFbFields([...fbFields, newField]);
    
    // Reset Form Input
    setNewFieldLabel('');
    setNewFieldOptions('');
  };

  const removeFbField = (index) => {
    const arr = [...fbFields];
    arr.splice(index, 1);
    setFbFields(arr);
  };

  const handleSaveFormSchema = async () => {
    try {
      await serviceCatalogService.update(fbService.id, { formSchema: fbFields });
      setFbModalOpen(false);
      fetchData(); // reload table
      alert('Formulário atualizado com Sucesso!');
    } catch(err) {
      alert('Erro ao salvar formulário dinâmico');
    }
  };

  // --- SLA Actions ---
  const openSlaModal = (sla = null) => {
    setEditingSla(sla);
    setSlaData(sla ? { name: sla.name, description: sla.description, responseHours: Math.round(sla.responseMinutes/60), resolveHours: Math.round(sla.resolveMinutes/60) } 
                   : { name: '', description: '', responseHours: 1, resolveHours: 24 });
    setSlaModalOpen(true);
  };

  const handleSaveSla = async () => {
    try {
      const payload = {
        name: slaData.name,
        description: slaData.description,
        responseMinutes: slaData.responseHours * 60,
        resolveMinutes: slaData.resolveHours * 60
      };
      
      if (editingSla) {
        alert('A edição de SLA não está ativa, exclua e crie outra para atualizar.');
      } else {
        await slaPolicyService.create(payload);
      }
      setSlaModalOpen(false);
      fetchData();
    } catch (err) { alert('Erro ao salvar SLA: ' + (err.response?.data?.error || err.message)); }
  };

  const handleDeleteSla = async (id) => {
    if(!window.confirm('Excluir Política de SLA? Isso pode falhar se já houver chamados amarrados a ela.')) return;
    try {
      await slaPolicyService.delete(id);
      fetchData();
    } catch(err) { alert('Erro ao excluir SLA (Provavelmente em uso): ' + (err.response?.data?.error || err.message)); }
  };

  return (
    <Box>
      <Typography variant={embedded ? 'subtitle1' : 'h5'} fontWeight="bold" mb={embedded ? 2 : 3}>
        Administração do Catálogo ITBM
      </Typography>
      {embedded && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Serviços, categorias, políticas de SLA e formulários do portal.
        </Typography>
      )}
      
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} textColor="primary" indicatorColor="primary">
          <Tab label="Serviços Habilitados" sx={{ fontWeight: 'bold' }} />
          <Tab label="Categorias de Serviço" sx={{ fontWeight: 'bold' }} />
          <Tab label="Políticas de Acordo (SLA)" sx={{ fontWeight: 'bold' }} />
        </Tabs>
      </Box>

      {activeTab === 0 && (
        <DataListTable
          size="medium"
          shell={{
            title: 'Serviços Habilitados',
            titleIcon: 'design_services',
            accentColor: '#2563eb',
            count: services.length,
            toolbar: (
              <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={() => openSvcModal()}>
                Novo Serviço
              </Button>
            ),
          }}
          columns={getCatalogServiceListColumns({
            onOpenFormBuilder: openFormBuilder,
            onEditService: openSvcModal,
            onDeleteService: handleDeleteService,
          })}
          rows={services}
          sortRows={sortCatalogServiceRows}
          defaultOrderBy="name"
          defaultOrder="asc"
          emptyMessage="Nenhum serviço cadastrado."
          resetPaginationKey={services.map((s) => s.id).join('-')}
          dataTestidTable="tabela-catalogo-servicos"
        />
      )}

      {activeTab === 1 && (
        <DataListTable
          size="medium"
          shell={{
            title: 'Categorias do Catálogo',
            titleIcon: 'folder',
            accentColor: '#2563eb',
            count: categories.length,
            toolbar: (
              <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={() => openCatModal()}>
                Nova Categoria
              </Button>
            ),
          }}
          columns={getCatalogCategoryListColumns({
            onEditCategory: openCatModal,
            onDeleteCategory: handleDeleteCategory,
          })}
          rows={categories}
          sortRows={sortCatalogCategoryRows}
          defaultOrderBy="name"
          defaultOrder="asc"
          emptyMessage="Nenhuma categoria cadastrada."
          resetPaginationKey={categories.map((c) => c.id).join('-')}
          dataTestidTable="tabela-catalogo-categorias"
        />
      )}

      {activeTab === 2 && (
        <DataListTable
          size="medium"
          shell={{
            title: 'Políticas de Acordo (SLA)',
            titleIcon: 'schedule',
            accentColor: '#7c3aed',
            count: slas.length,
            toolbar: (
              <Button
                size="small"
                variant="contained"
                color="secondary"
                startIcon={<AddIcon />}
                onClick={() => openSlaModal()}
              >
                Nova Política SLA
              </Button>
            ),
          }}
          columns={getCatalogSlaListColumns({ onDeleteSla: handleDeleteSla })}
          rows={slas}
          sortRows={sortCatalogSlaRows}
          defaultOrderBy="name"
          defaultOrder="asc"
          getDefaultOrderForColumn={(id) => (id === 'deadlines' ? 'desc' : 'asc')}
          emptyMessage="Nenhuma política de SLA cadastrada."
          resetPaginationKey={slas.map((s) => s.id).join('-')}
          dataTestidTable="tabela-catalogo-slas"
        />
      )}

      {/* Cat Modal */}
      <StandardModal
        open={catModalOpen}
        onClose={() => setCatModalOpen(false)}
        title={editingCat ? 'Editar Categoria' : 'Nova Categoria'}
        icon="folder"
        maxWidth="xs"
        actions={[
          { label: 'Cancelar', onClick: () => setCatModalOpen(false) },
          { label: 'Salvar', onClick: handleSaveCategory },
        ]}
      >
          <TextField autoFocus margin="dense" label="Nome" fullWidth value={catName} onChange={e => setCatName(e.target.value)} />
      </StandardModal>

      {/* Svc Modal */}
      <StandardModal
        open={svcModalOpen}
        onClose={() => setSvcModalOpen(false)}
        title={editingSvc ? 'Editar Serviço' : 'Novo Serviço'}
        icon="design_services"
        size="form"
        actions={[
          { label: 'Cancelar', onClick: () => setSvcModalOpen(false) },
          { label: 'Salvar Serviço', onClick: handleSaveService },
        ]}
      >
          <TextField autoFocus margin="dense" label="Nome do Serviço" fullWidth value={svcName} onChange={e => setSvcName(e.target.value)} />
          
          <Box display="flex" gap={2} mt={1}>
            <TextField margin="dense" select label="Categoria Mestre" fullWidth value={svcCatId} onChange={e => setSvcCatId(e.target.value)}>
              {categories.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
            </TextField>
            <TextField margin="dense" select label="Política de SLA (Opcional)" fullWidth value={svcSlaId} onChange={e => setSvcSlaId(e.target.value)}>
              <MenuItem value=""><em>Nenhuma Padrão</em></MenuItem>
              {slas.map(sla => <MenuItem key={sla.id} value={sla.id}>{sla.name}</MenuItem>)}
            </TextField>
          </Box>
          
          <TextField margin="dense" label="Descrição do Problema/Serviço a ser apresentado ao Usuário" fullWidth multiline rows={2} value={svcDesc} onChange={e => setSvcDesc(e.target.value)} />
      </StandardModal>

      {/* SLA Modal */}
      <StandardModal
        open={slaModalOpen}
        onClose={() => setSlaModalOpen(false)}
        title="Nova Política de SLA"
        icon="schedule"
        size="form"
        actions={[
          { label: 'Cancelar', onClick: () => setSlaModalOpen(false) },
          { label: 'Criar SLA', onClick: handleSaveSla, color: 'secondary' },
        ]}
      >
          <TextField autoFocus margin="dense" label="Nome da Política (ex: Alto Impacto - Ouro)" fullWidth value={slaData.name} onChange={e => setSlaData({...slaData, name: e.target.value})} />
          <TextField margin="dense" label="Descrição Interna" fullWidth value={slaData.description} onChange={e => setSlaData({...slaData, description: e.target.value})} />
          
          <Box display="flex" gap={2} mt={2}>
            <TextField margin="dense" type="number" label="Prazo de 1ª Resposta (Horas)" fullWidth value={slaData.responseHours} onChange={e => setSlaData({...slaData, responseHours: Number(e.target.value)})} />
            <TextField margin="dense" type="number" label="Prazo de Solução (Horas)" fullWidth value={slaData.resolveHours} onChange={e => setSlaData({...slaData, resolveHours: Number(e.target.value)})} />
          </Box>
      </StandardModal>

      {/* Form Builder Modal */}
      <StandardModal
        open={fbModalOpen}
        onClose={() => setFbModalOpen(false)}
        title={`Montador de Formulário: ${fbService?.name || ''}`}
        icon="dynamic_form"
        size="wide"
        footer={
          <>
            <Button onClick={() => setFbModalOpen(false)}>Cancelar Modificações</Button>
            <Button variant="contained" color="primary" onClick={handleSaveFormSchema} startIcon={<DynamicFormIcon />}>
              Salvar Planta do Formulário
            </Button>
          </>
        }
        contentSx={{ bgcolor: '#f8fafc' }}
      >
          
          <Paper elevation={0} sx={{ p: 3, mb: 4, bgcolor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px'}}>
            <Typography variant="subtitle1" gutterBottom fontWeight="bold" color="primary.main">
              + Adicionar Novo Campo ao Formulário
            </Typography>
            <Box display="flex" flexDirection="column" gap={3} mt={1}>
              <Box>
                <TextField label="Título da Pergunta / Solicitação" fullWidth value={newFieldLabel} onChange={e => setNewFieldLabel(e.target.value)} helperText="Ex: Informe o ID do equipamento ou o impacto" />
              </Box>
              <Box>
                <TextField select label="Tipo de Dado (Input)" fullWidth value={newFieldType} onChange={e => setNewFieldType(e.target.value)}>
                  <MenuItem value="text">Texto Curto</MenuItem>
                  <MenuItem value="textarea">Texto Longo (Área)</MenuItem>
                  <MenuItem value="number">Número</MenuItem>
                  <MenuItem value="date">Data</MenuItem>
                  <MenuItem value="select">Menu (Dropdown)</MenuItem>
                </TextField>
              </Box>
              <Box>
                <TextField select label="Obrigatório?" fullWidth value={newFieldRequired} onChange={e => setNewFieldRequired(e.target.value)}>
                  <MenuItem value={true}>Sim (Resposta Obrigatória)</MenuItem>
                  <MenuItem value={false}>Não (Resposta Opcional)</MenuItem>
                </TextField>
              </Box>
              
              {newFieldType === 'select' && (
                <Box>
                  <TextField multiline rows={3} label="Opções Disponíveis (Separadas por vírgula)" fullWidth value={newFieldOptions} onChange={e => setNewFieldOptions(e.target.value)} helperText="Ex: Windows, MacOS, Linux, Android..." />
                </Box>
              )}

              <Box display="flex" justifyContent="flex-end" mt={1}>
                <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={addFbField} sx={{ px: 4, borderRadius: '8px'}}>
                  Salvar Parâmetro na Grade
                </Button>
              </Box>
            </Box>
          </Paper>

          <Box mb={2} display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6" fontWeight="bold">Pré-visualização do Formulário ({fbFields.length} campos)</Typography>
            {fbFields.length === 0 && (
              <Button size="small" variant="outlined" color="secondary" onClick={() => {
                setFbFields([
                  { id: `field_${Date.now()}_1`, label: 'Qual o Impacto desse problema no seu trabalho?', type: 'select', required: true, options: ['Baixo (Posso continuar trabalhando)', 'Médio (Incomoda, mas consigo contornar)', 'Alto (Totalmente paralisado)'] },
                  { id: `field_${Date.now()}_2`, label: 'Previsão de Máquina ou Patrimônio (Opcional)', type: 'text', required: false, options: [] },
                  { id: `field_${Date.now()}_3`, label: 'Telefone Alternativo para Contato', type: 'text', required: false, options: [] }
                ]);
              }}>
                Carregar Template Básico de Incidente
              </Button>
            )}
          </Box>
          
          {fbFields.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center', bgcolor: '#f1f5f9', border: '1px dashed #cbd5e1', borderRadius: '8px'}} elevation={0}>
                <Typography variant="body1" color="text.secondary" fontWeight="500">Nenhum campo personalizado adicionado a este serviço.</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Apenas o "Título" e a "Descrição Plana" serão solicitados ao usuário como padrão.</Typography>
            </Paper>
          ) : (
            <Paper elevation={0} sx={{ p: 3, bgcolor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: 3 }}>
              {fbFields.map((field, idx) => (
                <Box key={idx} sx={{ position: 'relative', p: 2, border: '1px solid #e2e8f0', borderRadius: '8px', '&:hover': { borderColor: '#cbd5e1', bgcolor: '#f8fafc' }, transition: 'all 0.2s' }}>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1.5}>
                    <Typography variant="body1" fontWeight="600" color="text.primary">
                      {field.label} {field.required && <span style={{ color: '#ef4444' }}>*</span>}
                    </Typography>
                    <IconButton size="small" color="error" onClick={() => removeFbField(idx)} sx={{ mt: -1, mr: -1 }} title="Remover Campo">
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                  
                  {/* Mock Input Renderer */}
                  {field.type === 'text' && <TextField disabled size="small" fullWidth placeholder="Resposta curta..." sx={{ bgcolor: '#fff' }} />}
                  {field.type === 'textarea' && <TextField disabled size="small" fullWidth multiline rows={3} placeholder="Resposta longa detalhada..." sx={{ bgcolor: '#fff' }} />}
                  {field.type === 'number' && <TextField disabled size="small" type="number" fullWidth placeholder="123..." sx={{ bgcolor: '#fff' }} />}
                  {field.type === 'date' && <TextField disabled size="small" type="date" fullWidth sx={{ bgcolor: '#fff' }} />}
                  {field.type === 'select' && (
                    <TextField disabled size="small" select fullWidth label="Selecione uma opção clicando aqui" sx={{ bgcolor: '#fff' }}>
                      {field.options && field.options.map((opt, i) => <MenuItem key={i} value={opt}>{opt}</MenuItem>)}
                    </TextField>
                  )}
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, fontWeight: '500' }}>TIPO INTERNO: {field.type.toUpperCase()}</Typography>
                </Box>
              ))}
            </Paper>
          )}

      </StandardModal>

    </Box>
  );
};

const CatalogAdmin = () => (
  <Navigate to="/config/organization?tab=servicedesk&sd=catalog" replace />
);

export default CatalogAdmin;
