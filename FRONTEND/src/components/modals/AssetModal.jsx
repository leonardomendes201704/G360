import { useEffect, useState, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Button, IconButton, TextField, MenuItem, Box, Typography, InputAdornment, Alert } from '@mui/material';
import StandardModal from '../common/StandardModal';
import { Edit, Delete } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { format } from 'date-fns';

import { getAssetCategories, createAssetCategory } from '../../services/asset-category.service';
import InlineCreateSelect from '../common/InlineCreateSelect';
import { getReferenceSuppliers, getReferenceCostCenters, getReferenceContracts } from '../../services/reference.service';
import { getMaintenances, createMaintenance, updateMaintenance, deleteMaintenance } from '../../services/asset-maintenance.service';
import AssetMaintenanceModal from './AssetMaintenanceModal';

// Schema dinâmico baseado no tipo
const createSchema = (assetType) => {
    if (assetType === 'LICENSE') {
        return yup.object({
            assetType: yup.string().required(),
            name: yup.string().required('Nome do software é obrigatório'),
            vendor: yup.string().required('Fabricante é obrigatório'),
            licenseType: yup.string().required('Tipo de licença é obrigatório'),
            quantity: yup.number().min(1, 'Mínimo 1').default(1),
            licenseKey: yup.string(),
            purchaseDate: yup.string().nullable(),
            expirationDate: yup.string().nullable(),
            cost: yup.number().nullable().transform((v, o) => o === '' ? null : v),
            notes: yup.string()
        }).required();
    }
    return yup.object({
        assetType: yup.string().required(),
        code: yup.string().required('Código/Patrimônio é obrigatório'),
        name: yup.string().required('Nome do ativo é obrigatório'),
        categoryId: yup.string().required('Categoria é obrigatória'),
        status: yup.string().required('Status é obrigatório'),
        contractId: yup.string().nullable().when('status', {
            is: 'LOCADO',
            then: () => yup.string().required('Para ativos locados, o contrato é obrigatório.'),
            otherwise: () => yup.string().nullable()
        }),
        supplierId: yup.string().nullable(),
        costCenterId: yup.string().nullable(),
        serialNumber: yup.string(),
        location: yup.string(),
        assignedTo: yup.string(),
        acquisitionDate: yup.string().nullable(),
        acquisitionValue: yup.number().nullable().transform((v, o) => o === '' ? null : v),
        rentValue: yup.number().nullable().transform((v, o) => o === '' ? null : v)
    }).required();
};

const AssetModal = ({ open, onClose, onSave, onSaveLicense, onDelete, asset = null, isViewMode = false, categories: propCategories = [], users = [], defaultCreateType = 'HARDWARE' }) => {
    const { enqueueSnackbar } = useSnackbar();
    const [assetType, setAssetType] = useState('HARDWARE'); // HARDWARE ou LICENSE
    const [activeTab, setActiveTab] = useState(0);

    // Listas
    const [categories, setCategories] = useState(propCategories);
    const [suppliers, setSuppliers] = useState([]);
    const [contracts, setContracts] = useState([]);
    const [costCenters, setCostCenters] = useState([]);
    const [maintenances, setMaintenances] = useState([]);
    const [maintModalOpen, setMaintModalOpen] = useState(false);
    const [selectedMaint, setSelectedMaint] = useState(null);

    const refreshCategories = async () => {
        const cats = await getAssetCategories();
        const hardwareCats = cats.filter(c => c.name.toLowerCase() !== 'software');
        setCategories(hardwareCats);
    };

    const schema = useMemo(() => createSchema(assetType), [assetType]);

    const { control, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm({
        resolver: yupResolver(schema),
        defaultValues: {
            assetType: 'HARDWARE',
            code: '', name: '', categoryId: '', status: 'PROPRIO',
            supplierId: '', contractId: '', costCenterId: '',
            serialNumber: '', location: '', assignedTo: '',
            acquisitionDate: '', acquisitionValue: '', rentValue: '',
            // License fields
            vendor: '', licenseType: 'ASSINATURA', quantity: 1,
            licenseKey: '', purchaseDate: '', expirationDate: '', cost: '', notes: ''
        }
    });

    const watchStatus = watch('status');

    useEffect(() => {
        if (open) {
            // Edição: tipo vem do registo; criação: `defaultCreateType` (Novo ativo vs Nova licença)
            const type = asset
                ? (asset.licenseType ? 'LICENSE' : 'HARDWARE')
                : (defaultCreateType === 'LICENSE' ? 'LICENSE' : 'HARDWARE');
            setAssetType(type);

            if (propCategories.length > 0) {
                setCategories(propCategories);
                Promise.all([getReferenceSuppliers(), getReferenceContracts(), getReferenceCostCenters()])
                    .then(([supps, conts, ccs]) => { setSuppliers(supps); setContracts(conts); setCostCenters(ccs); });
            } else if (categories.length === 0) {
                Promise.all([getAssetCategories(), getReferenceSuppliers(), getReferenceContracts(), getReferenceCostCenters()])
                    .then(([cats, supps, conts, ccs]) => {
                        // Filter out 'Software' category as requested
                        const hardwareCats = cats.filter(c => c.name.toLowerCase() !== 'software');
                        setCategories(hardwareCats);
                        setSuppliers(supps);
                        setContracts(conts);
                        setCostCenters(ccs);
                    });
            } else {
                Promise.all([getReferenceSuppliers(), getReferenceContracts(), getReferenceCostCenters()])
                    .then(([supps, conts, ccs]) => { setSuppliers(supps); setContracts(conts); setCostCenters(ccs); });
            }

            if (asset) {
                if (asset.licenseType) {
                    // É uma licença
                    reset({
                        assetType: 'LICENSE',
                        name: asset.name || '', vendor: asset.vendor || '',
                        licenseType: asset.licenseType || 'ASSINATURA',
                        quantity: asset.quantity || 1, licenseKey: asset.licenseKey || '',
                        purchaseDate: asset.purchaseDate ? asset.purchaseDate.split('T')[0] : '',
                        expirationDate: asset.expirationDate ? asset.expirationDate.split('T')[0] : '',
                        cost: asset.cost || '', notes: asset.notes || ''
                    });
                } else {
                    // É um hardware — strip relation objects to avoid Yup validation issues
                    const { category, supplier, contract, costCenter, maintenances: _m, ...assetData } = asset;
                    reset({
                        assetType: 'HARDWARE',
                        ...assetData,
                        categoryId: asset.categoryId || '', supplierId: asset.supplierId || '',
                        contractId: asset.contractId || '', costCenterId: asset.costCenterId || '',
                        acquisitionDate: asset.acquisitionDate ? asset.acquisitionDate.split('T')[0] : '',
                        serialNumber: asset.serialNumber || '', location: asset.location || '',
                        assignedTo: asset.assignedTo || '', acquisitionValue: asset.acquisitionValue || '',
                        rentValue: asset.rentValue || ''
                    });
                    loadMaintenances();
                }
            } else if (type === 'LICENSE') {
                reset({
                    assetType: 'LICENSE',
                    code: '', name: '', categoryId: '', status: 'PROPRIO',
                    supplierId: '', contractId: '', costCenterId: '',
                    serialNumber: '', location: '', assignedTo: '',
                    acquisitionDate: '', acquisitionValue: '', rentValue: '',
                    vendor: '', licenseType: 'ASSINATURA', quantity: 1,
                    licenseKey: '', purchaseDate: '', expirationDate: '', cost: '', notes: '',
                });
            } else {
                reset({
                    assetType: 'HARDWARE',
                    code: '', name: '', categoryId: '', status: 'PROPRIO',
                    supplierId: '', contractId: '', costCenterId: '',
                    serialNumber: '', location: '', assignedTo: '',
                    acquisitionDate: '', acquisitionValue: '', rentValue: '',
                    vendor: '', licenseType: 'ASSINATURA', quantity: 1,
                    licenseKey: '', purchaseDate: '', expirationDate: '', cost: '', notes: ''
                });
            }
        }
        setActiveTab(0);
    }, [open, asset, defaultCreateType]);

    const loadMaintenances = async () => {
        if (!asset) return;
        try { const data = await getMaintenances(asset.id); setMaintenances(data); }
        catch (e) { console.error(e); }
    };

    const handleTypeChange = (newType) => {
        if (asset) return; // Não pode mudar tipo quando editando
        setAssetType(newType);
        setValue('assetType', newType);
    };

    const onSubmit = (data) => {
        if (isViewMode) return;
        if (assetType === 'LICENSE') {
            const payload = {
                name: data.name, vendor: data.vendor, licenseType: data.licenseType,
                quantity: data.quantity, licenseKey: data.licenseKey || null,
                purchaseDate: data.purchaseDate || null, expirationDate: data.expirationDate || null,
                cost: data.cost || null, notes: data.notes || null
            };
            if (onSaveLicense) onSaveLicense(payload);
            else onSave(payload);
        } else {
            const payload = {
                ...data,
                supplierId: data.supplierId || null, contractId: data.contractId || null,
                costCenterId: data.costCenterId || null, acquisitionDate: data.acquisitionDate || null,
                acquisitionValue: data.acquisitionValue || null, rentValue: data.rentValue || null
            };
            onSave(payload);
        }
    };

    const handleSaveMaint = async (data) => {
        try {
            if (selectedMaint) await updateMaintenance(selectedMaint.id, data);
            else await createMaintenance(asset.id, data);
            setMaintModalOpen(false); loadMaintenances();
            enqueueSnackbar('Manutenção salva!', { variant: 'success' });
        } catch (e) { enqueueSnackbar('Erro ao salvar manutenção', { variant: 'error' }); }
    };

    const handleDeleteMaint = async (id) => {
        if (!window.confirm('Excluir registro de manutenção?')) return;
        try { await deleteMaintenance(id); loadMaintenances(); enqueueSnackbar('Excluído!', { variant: 'success' }); }
        catch (e) { enqueueSnackbar('Erro ao excluir', { variant: 'error' }); }
    };

    if (!open) return null;

    const assetModalTitle = isViewMode ? 'Detalhes do ativo' : (asset ? 'Editar ativo' : 'Novo ativo');
    const assetModalSubtitle = assetType === 'LICENSE' ? 'Licença de software' : 'Hardware / equipamento';
    const assetModalIcon = assetType === 'LICENSE' ? 'key' : 'computer';

    const sectionStyle = { marginBottom: '24px' };
    const sectionTitleStyle = { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', fontSize: '14px', fontWeight: 600, color: 'var(--modal-text)', textTransform: 'uppercase', letterSpacing: '0.5px' };
    const labelStyle = { display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500, color: 'var(--modal-text-secondary)' };
    const inputStyle = { width: '100%', padding: '12px 14px', background: 'var(--modal-surface)', border: '1px solid var(--modal-border-strong)', borderRadius: '8px', color: 'var(--modal-text)', fontSize: '14px', outline: 'none' };
    const gridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' };
    const grid3Style = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' };

    const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

    return (
        <>
            <StandardModal
                open={open}
                onClose={onClose}
                title={assetModalTitle}
                subtitle={assetModalSubtitle}
                icon={assetModalIcon}
                size="wide"
                footer={
                    <Box sx={{ display: 'flex', width: '100%', justifyContent: 'flex-end', gap: 1.5, flexWrap: 'wrap' }}>
                        <Button type="button" onClick={onClose} variant="outlined" color="inherit" sx={{ textTransform: 'none', fontWeight: 600 }}>
                            {isViewMode ? 'Fechar' : 'Cancelar'}
                        </Button>
                        {!isViewMode && activeTab === 0 && (
                            <Button type="submit" form="assetUnifiedForm" variant="contained" color="primary" sx={{ textTransform: 'none', fontWeight: 600 }}>
                                {assetType === 'LICENSE' ? 'Salvar licença' : 'Salvar ativo'}
                            </Button>
                        )}
                    </Box>
                }
            >
            {/* Type Toggle (somente para novo ativo) */}
            {!asset && (
                <div style={{ padding: '16px 32px', borderBottom: '1px solid var(--modal-border)', background: 'var(--modal-ink-soft)' }}>
                    <div style={{ fontSize: '12px', color: 'var(--modal-text-muted)', marginBottom: '10px', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.5px' }}>
                        Tipo de Ativo
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button
                            type="button"
                            onClick={() => handleTypeChange('HARDWARE')}
                            style={{
                                flex: 1, padding: '14px 20px', borderRadius: '8px', cursor: 'pointer',
                                border: assetType === 'HARDWARE' ? '2px solid #2563eb' : '1px solid var(--modal-border-strong)',
                                background: assetType === 'HARDWARE' ? 'rgba(37, 99, 235, 0.15)' : 'var(--modal-surface)',
                                display: 'flex', alignItems: 'center', gap: '12px', transition: 'all 0.2s'
                            }}
                        >
                            <span className="material-icons-round" style={{ fontSize: '24px', color: assetType === 'HARDWARE' ? '#2563eb' : 'var(--modal-text-muted)' }}>computer</span>
                            <div style={{ textAlign: 'left' }}>
                                <div style={{ fontSize: '15px', fontWeight: 600, color: assetType === 'HARDWARE' ? 'var(--modal-text)' : 'var(--modal-text-secondary)' }}>Hardware</div>
                                <div style={{ fontSize: '12px', color: 'var(--modal-text-muted)' }}>Equipamentos físicos</div>
                            </div>
                        </button>
                        <button
                            type="button"
                            onClick={() => handleTypeChange('LICENSE')}
                            style={{
                                flex: 1, padding: '14px 20px', borderRadius: '8px', cursor: 'pointer',
                                border: assetType === 'LICENSE' ? '2px solid #3b82f6' : '1px solid var(--modal-border-strong)',
                                background: assetType === 'LICENSE' ? 'rgba(59, 130, 246, 0.15)' : 'var(--modal-surface)',
                                display: 'flex', alignItems: 'center', gap: '12px', transition: 'all 0.2s'
                            }}
                        >
                            <span className="material-icons-round" style={{ fontSize: '24px', color: assetType === 'LICENSE' ? '#3b82f6' : 'var(--modal-text-muted)' }}>key</span>
                            <div style={{ textAlign: 'left' }}>
                                <div style={{ fontSize: '15px', fontWeight: 600, color: assetType === 'LICENSE' ? 'var(--modal-text)' : 'var(--modal-text-secondary)' }}>Licença de Software</div>
                                <div style={{ fontSize: '12px', color: 'var(--modal-text-muted)' }}>Assinaturas e chaves</div>
                            </div>
                        </button>
                    </div>
                </div>
            )}

            {/* Tabs (somente para edição de hardware) */}
            {asset && assetType === 'HARDWARE' && (
                <div style={{ display: 'flex', gap: '0', borderBottom: '1px solid var(--modal-border)' }}>
                    <button
                        type="button"
                        onClick={() => setActiveTab(0)}
                        style={{
                            flex: 1, padding: '14px', background: 'transparent', border: 'none',
                            borderBottom: activeTab === 0 ? '2px solid #2563eb' : '2px solid transparent',
                            color: activeTab === 0 ? 'var(--modal-text)' : 'var(--modal-text-muted)', cursor: 'pointer',
                            fontSize: '14px', fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                        }}
                    >
                        <span className="material-icons-round" style={{ fontSize: '18px' }}>info</span> Dados Gerais
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab(1)}
                        style={{
                            flex: 1, padding: '14px', background: 'transparent', border: 'none',
                            borderBottom: activeTab === 1 ? '2px solid #2563eb' : '2px solid transparent',
                            color: activeTab === 1 ? 'var(--modal-text)' : 'var(--modal-text-muted)', cursor: 'pointer',
                            fontSize: '14px', fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                        }}
                    >
                        <span className="material-icons-round" style={{ fontSize: '18px' }}>build</span> Manutenções ({maintenances.length})
                    </button>
                </div>
            )}

            {/* Body */}
            <div style={{ padding: '32px', overflowY: 'auto', flex: 1 }}>
                <form id="assetUnifiedForm" onSubmit={handleSubmit(onSubmit)}>

                    {/* ======================== HARDWARE FIELDS ======================== */}
                    {assetType === 'HARDWARE' && activeTab === 0 && (
                        <>
                            {watchStatus === 'LOCADO' && (
                                <div style={{ padding: '12px 16px', background: 'rgba(6, 182, 212, 0.1)', border: '1px solid rgba(6, 182, 212, 0.2)', borderRadius: '8px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span className="material-icons-round" style={{ color: '#06b6d4', fontSize: '20px' }}>info</span>
                                    <span style={{ color: 'var(--modal-text-secondary)', fontSize: '13px' }}>Para ativos locados, é obrigatório vincular o contrato de locação.</span>
                                </div>
                            )}

                            <div style={sectionStyle}>
                                <div style={sectionTitleStyle}>
                                    <span className="material-icons-round" style={{ fontSize: '20px', color: '#2563eb' }}>qr_code</span>
                                    Identificação
                                </div>
                                <div style={gridStyle}>
                                    <div>
                                        <label style={labelStyle}>Código / Patrimônio <span style={{ color: '#f43f5e' }}>*</span></label>
                                        <Controller name="code" control={control} render={({ field }) => (
                                            <input {...field} style={{ ...inputStyle, borderColor: errors.code ? '#f43f5e' : 'var(--modal-border-strong)' }} placeholder="Ex: PAT-001" disabled={isViewMode} />
                                        )} />
                                        {errors.code && <span style={{ color: '#f43f5e', fontSize: '12px' }}>{errors.code.message}</span>}
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Nome do Ativo <span style={{ color: '#f43f5e' }}>*</span></label>
                                        <Controller name="name" control={control} render={({ field }) => (
                                            <input {...field} style={{ ...inputStyle, borderColor: errors.name ? '#f43f5e' : 'var(--modal-border-strong)' }} placeholder="Ex: MacBook Pro M1" disabled={isViewMode} />
                                        )} />
                                        {errors.name && <span style={{ color: '#f43f5e', fontSize: '12px' }}>{errors.name.message}</span>}
                                    </div>
                                </div>
                                <div style={{ ...gridStyle, marginTop: '16px' }}>
                                    <div>
                                        <Controller name="categoryId" control={control} render={({ field }) => (
                                            <InlineCreateSelect
                                                label="Categoria"
                                                required
                                                value={field.value}
                                                onChange={field.onChange}
                                                options={categories}
                                                disabled={isViewMode}
                                                error={!!errors.categoryId}
                                                helperText={errors.categoryId?.message}
                                                onCreateNew={async (name) => createAssetCategory({ name, type: assetType === 'LICENSE' ? 'SOFTWARE' : 'HARDWARE' })}
                                                onRefresh={refreshCategories}
                                                selectSx={{ background: 'var(--modal-surface-hover)', border: '1px solid var(--modal-border-strong)', borderRadius: '8px', '& fieldset': { border: 'none' } }}
                                            />
                                        )} />
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Situação <span style={{ color: '#f43f5e' }}>*</span></label>
                                        <Controller name="status" control={control} render={({ field }) => (
                                            <select {...field} style={inputStyle} disabled={isViewMode}>
                                                <option value="PROPRIO">Próprio</option>
                                                <option value="LOCADO">Locado / Leasing</option>
                                                <option value="MANUTENCAO">Em Manutenção</option>
                                                <option value="DESATIVADO">Desativado</option>
                                            </select>
                                        
                                        )} />
                                    </div>
                                </div>
                            </div>

                            <div style={sectionStyle}>
                                <div style={sectionTitleStyle}>
                                    <span className="material-icons-round" style={{ fontSize: '20px', color: '#10b981' }}>attach_money</span>
                                    Financeiro & Localização
                                </div>
                                <div style={grid3Style}>
                                    <div>
                                        <label style={labelStyle}>{watchStatus === 'LOCADO' ? 'Início da Locação' : 'Data Aquisição'}</label>
                                        <Controller name="acquisitionDate" control={control} render={({ field }) => (
                                            <input {...field} type="date" style={inputStyle} disabled={isViewMode} />
                                        )} />
                                    </div>
                                    <div>
                                        <label style={labelStyle}>{watchStatus === 'LOCADO' ? 'Valor Mensal (Locação)' : 'Valor Aquisição'}</label>
                                        <Controller name={watchStatus === 'LOCADO' ? 'rentValue' : 'acquisitionValue'} control={control} render={({ field }) => (
                                            <input {...field} type="number" step="0.01" style={inputStyle} placeholder="0,00" disabled={isViewMode} />
                                        )} />
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Serial Number</label>
                                        <Controller name="serialNumber" control={control} render={({ field }) => (
                                            <input {...field} style={inputStyle} placeholder="S/N" disabled={isViewMode} />
                                        )} />
                                    </div>
                                </div>
                                <div style={{ ...gridStyle, marginTop: '16px' }}>
                                    <div>
                                        <label style={labelStyle}>Localização</label>
                                        <Controller name="location" control={control} render={({ field }) => (
                                            <input {...field} style={inputStyle} placeholder="Ex: Escritório SP" disabled={isViewMode} />
                                        )} />
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Responsável</label>
                                        <Controller name="assignedTo" control={control} render={({ field }) => (
                                            <select {...field} style={inputStyle} disabled={isViewMode}>
                                                <option value="">Nenhum</option>
                                                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                            </select>
                                        
                                        )} />
                                    </div>
                                </div>
                            </div>

                            <div style={sectionStyle}>
                                <div style={sectionTitleStyle}>
                                    <span className="material-icons-round" style={{ fontSize: '20px', color: '#f59e0b' }}>link</span>
                                    Vínculos
                                </div>
                                <div style={grid3Style}>
                                    <div>
                                        <label style={labelStyle}>Fornecedor</label>
                                        <Controller name="supplierId" control={control} render={({ field }) => (
                                            <select {...field} style={inputStyle} disabled={isViewMode}>
                                                <option value="">Nenhum</option>
                                                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                            </select>
                                        
                                        )} />
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Contrato{watchStatus === 'LOCADO' && <span style={{ color: '#f43f5e' }}> *</span>}</label>
                                        {errors.contractId && <span style={{ color: '#f43f5e', fontSize: '12px', display: 'block', marginBottom: 4 }}>{errors.contractId.message}</span>}
                                        <Controller name="contractId" control={control} render={({ field }) => (
                                            <select {...field} style={{ ...inputStyle, borderColor: errors.contractId ? '#f43f5e' : 'var(--modal-border-strong)' }} disabled={isViewMode}>
                                                <option value="">Nenhum</option>
                                                {contracts.map(c => <option key={c.id} value={c.id}>{c.number} - {c.description}</option>)}
                                            </select>
                                        
                                        )} />
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Centro de Custo</label>
                                        <Controller name="costCenterId" control={control} render={({ field }) => (
                                            <select {...field} style={inputStyle} disabled={isViewMode}>
                                                <option value="">Nenhum</option>
                                                {costCenters.map(cc => <option key={cc.id} value={cc.id}>{cc.code}</option>)}
                                            </select>
                                        
                                        )} />
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {/* Manutenções Tab */}
                    {assetType === 'HARDWARE' && activeTab === 1 && (
                        <div>
                            {!isViewMode && (
                                <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                                    <button type="button" onClick={() => { setSelectedMaint(null); setMaintModalOpen(true); }}
                                        style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)', color: 'var(--modal-text)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span className="material-icons-round" style={{ fontSize: '18px' }}>add</span> Registrar Manutenção
                                    </button>
                                </div>
                            )}
                            <div style={{ background: 'var(--modal-surface)', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--modal-border)' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ background: 'rgba(0,0,0,0.3)' }}>
                                            <th style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--modal-text-muted)', fontSize: '12px', fontWeight: 600 }}>DATA</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--modal-text-muted)', fontSize: '12px', fontWeight: 600 }}>TIPO</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--modal-text-muted)', fontSize: '12px', fontWeight: 600 }}>DESCRIÇÃO</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--modal-text-muted)', fontSize: '12px', fontWeight: 600 }}>STATUS</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--modal-text-muted)', fontSize: '12px', fontWeight: 600 }}>CUSTO</th>
                                            {!isViewMode && <th style={{ padding: '12px 16px', textAlign: 'center', color: 'var(--modal-text-muted)', fontSize: '12px', fontWeight: 600 }}>AÇÕES</th>}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {maintenances.length === 0 && (
                                            <tr><td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: 'var(--modal-text-muted)' }}>Nenhuma manutenção registrada.</td></tr>
                                        )}
                                        {maintenances.map(m => (
                                            <tr key={m.id} style={{ borderTop: '1px solid var(--modal-border)' }}>
                                                <td style={{ padding: '12px 16px', color: 'var(--modal-text-secondary)', fontSize: '14px' }}>{format(new Date(m.startDate), 'dd/MM/yyyy')}</td>
                                                <td style={{ padding: '12px 16px' }}>
                                                    <span style={{ padding: '4px 10px', background: 'rgba(37, 99, 235, 0.15)', color: '#2563eb', borderRadius: '8px', fontSize: '12px', fontWeight: 600 }}>{m.type}</span>
                                                </td>
                                                <td style={{ padding: '12px 16px', color: 'var(--modal-text)', fontSize: '14px' }}>{m.description}</td>
                                                <td style={{ padding: '12px 16px', color: 'var(--modal-text-secondary)', fontSize: '14px' }}>{m.status}</td>
                                                <td style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--modal-text)', fontWeight: 600 }}>{m.cost ? formatCurrency(m.cost) : '-'}</td>
                                                {!isViewMode && (
                                                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                        <IconButton size="small" onClick={() => { setSelectedMaint(m); setMaintModalOpen(true); }} sx={{ color: '#2563eb' }}><Edit fontSize="small" /></IconButton>
                                                        <IconButton size="small" onClick={() => handleDeleteMaint(m.id)} sx={{ color: '#f43f5e' }}><Delete fontSize="small" /></IconButton>
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* ======================== LICENSE FIELDS ======================== */}
                    {assetType === 'LICENSE' && (
                        <>
                            <div style={sectionStyle}>
                                <div style={sectionTitleStyle}>
                                    <span className="material-icons-round" style={{ fontSize: '20px', color: '#3b82f6' }}>apps</span>
                                    Informações do Software
                                </div>
                                <div style={gridStyle}>
                                    <div>
                                        <label style={labelStyle}>Nome do Software <span style={{ color: '#f43f5e' }}>*</span></label>
                                        <Controller name="name" control={control} render={({ field }) => (
                                            <input {...field} style={{ ...inputStyle, borderColor: errors.name ? '#f43f5e' : 'var(--modal-border-strong)' }} placeholder="Ex: Microsoft 365" disabled={isViewMode} />
                                        )} />
                                        {errors.name && <span style={{ color: '#f43f5e', fontSize: '12px' }}>{errors.name.message}</span>}
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Fabricante <span style={{ color: '#f43f5e' }}>*</span></label>
                                        <Controller name="vendor" control={control} render={({ field }) => (
                                            <input {...field} style={{ ...inputStyle, borderColor: errors.vendor ? '#f43f5e' : 'var(--modal-border-strong)' }} placeholder="Ex: Microsoft" disabled={isViewMode} />
                                        )} />
                                        {errors.vendor && <span style={{ color: '#f43f5e', fontSize: '12px' }}>{errors.vendor.message}</span>}
                                    </div>
                                </div>
                            </div>

                            <div style={sectionStyle}>
                                <div style={sectionTitleStyle}>
                                    <span className="material-icons-round" style={{ fontSize: '20px', color: '#06b6d4' }}>vpn_key</span>
                                    Licenciamento
                                </div>
                                <div style={grid3Style}>
                                    <div>
                                        <label style={labelStyle}>Tipo de Licença <span style={{ color: '#f43f5e' }}>*</span></label>
                                        <Controller name="licenseType" control={control} render={({ field }) => (
                                            <select {...field} style={inputStyle} disabled={isViewMode}>
                                                <option value="ASSINATURA">Assinatura (SaaS)</option>
                                                <option value="PERPETUA">Perpétua</option>
                                                <option value="OEM">OEM</option>
                                                <option value="VOLUME">Volume</option>
                                            </select>
                                        
                                        )} />
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Quantidade</label>
                                        <Controller name="quantity" control={control} render={({ field }) => (
                                            <input {...field} type="number" min="1" style={inputStyle} disabled={isViewMode} />
                                        )} />
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Custo Unitário</label>
                                        <Controller name="cost" control={control} render={({ field }) => (
                                            <input {...field} type="number" step="0.01" style={inputStyle} placeholder="0,00" disabled={isViewMode} />
                                        )} />
                                    </div>
                                </div>
                                <div style={{ marginTop: '16px' }}>
                                    <label style={labelStyle}>Chave de Ativação</label>
                                    <Controller name="licenseKey" control={control} render={({ field }) => (
                                        <input {...field} style={inputStyle} placeholder="XXXX-XXXX-XXXX-XXXX" disabled={isViewMode} />
                                    )} />
                                </div>
                            </div>

                            <div style={sectionStyle}>
                                <div style={sectionTitleStyle}>
                                    <span className="material-icons-round" style={{ fontSize: '20px', color: '#10b981' }}>event</span>
                                    Datas
                                </div>
                                <div style={gridStyle}>
                                    <div>
                                        <label style={labelStyle}>Data de Compra</label>
                                        <Controller name="purchaseDate" control={control} render={({ field }) => (
                                            <input {...field} type="date" style={inputStyle} disabled={isViewMode} />
                                        )} />
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Data de Expiração</label>
                                        <Controller name="expirationDate" control={control} render={({ field }) => (
                                            <input {...field} type="date" style={inputStyle} disabled={isViewMode} />
                                        )} />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label style={labelStyle}>Observações</label>
                                <Controller name="notes" control={control} render={({ field }) => (
                                    <textarea {...field} rows={3} style={{ ...inputStyle, resize: 'vertical' }} placeholder="Notas adicionais..." disabled={isViewMode} />
                                )} />
                            </div>
                        </>
                    )}
                </form>
            </div>
            </StandardModal>

            <AssetMaintenanceModal open={maintModalOpen} onClose={() => setMaintModalOpen(false)} onSave={handleSaveMaint} maintenance={selectedMaint} />
        </>
    );
};

export default AssetModal;

