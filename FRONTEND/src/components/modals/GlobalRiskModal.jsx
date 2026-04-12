import React, { useState, useEffect } from 'react';
import { useSnackbar } from 'notistack';
import { createRisk, updateRisk } from '../../services/corporate-risk.service';
import { getUsers } from '../../services/user.service';
import { getDepartments } from '../../services/department.service';
import { getCostCenters } from '../../services/cost-center.service';
import { getAssets } from '../../services/asset.service';
import { Box, Dialog } from '@mui/material';
import { Close, Check, Lock } from '@mui/icons-material';

// CSS from riscos.html
const modalStyles = `
    /* --- MODAL WIZARD STYLES (Dark Theme Compatible) --- */
    .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0, 0, 0, 0.4); backdrop-filter: blur(2px); z-index: 1000; display: flex; align-items: center; justify-content: center; opacity: 0; visibility: hidden; transition: all 0.2s ease; }
    .modal-overlay.open { opacity: 1; visibility: visible; }
    
    .modal-window { 
        background-color: var(--modal-bg, #ffffff); 
        color: var(--modal-text, #1f2937);
        width: 700px; 
        max-width: 95%; 
        max-height: 90vh;
        border-radius: 10px; 
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); 
        display: flex; flex-direction: column; 
        overflow: hidden; 
        transform: scale(0.98); transition: transform 0.2s ease;
        font-family: 'Inter', sans-serif;
    }
    .modal-overlay.open .modal-window { transform: scale(1); }

    .modal-header { padding: 16px 24px; background-color: var(--modal-surface-subtle, #f8fafc); border-bottom: 1px solid var(--modal-border, #e5e7eb); }
    .modal-top-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .modal-title { font-size: 1rem; font-weight: 600; color: var(--modal-text, #1f2937); margin: 0; }
    .modal-close { background: none; border: none; font-size: 1.1rem; color: var(--modal-text-muted, #9ca3af); cursor: pointer; display: flex; align-items: center; justify-content: center; }
    
    /* Stepper Compacto */
    .stepper { display: flex; align-items: center; position: relative; padding: 0 10px; }
    .stepper::before { content: ''; position: absolute; top: 11px; left: 30px; right: 30px; height: 2px; background-color: var(--modal-border, #e2e8f0); z-index: 0; }
    .step { position: relative; z-index: 1; background: var(--modal-surface-subtle, #f8fafc); padding: 0 10px; display: flex; flex-direction: column; align-items: center; flex: 1; }
    .step-circle { width: 22px; height: 22px; border-radius: 50%; background-color: var(--modal-bg, white); border: 2px solid var(--modal-border-strong, #cbd5e1); color: var(--modal-text-muted, #64748b); font-size: 0.75rem; font-weight: 600; display: flex; align-items: center; justify-content: center; margin-bottom: 4px; transition: all 0.3s; }
    .step.active .step-circle { border-color: #2563eb; background-color: #2563eb; color: white; }
    .step.completed .step-circle { border-color: #2563eb; background-color: #2563eb; color: white; }
    .step-label { font-size: 0.7rem; font-weight: 500; color: var(--modal-text-muted, #64748b); }
    .step.active .step-label { color: #2563eb; font-weight: 600; }

    .modal-body { padding: 24px; min-height: 380px; overflow-y: auto; flex: 1; }
    .wizard-step { display: none; }
    .wizard-step.active { display: block; animation: slideIn 0.3s ease; }
    @keyframes slideIn { from { opacity: 0; transform: translateX(10px); } to { opacity: 1; transform: translateX(0); } }

    /* Form Controls */
    .form-section-label { font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: var(--modal-text-muted, #9ca3af); margin-bottom: 12px; letter-spacing: 0.05em; border-bottom: 1px dashed var(--modal-border, #e5e7eb); padding-bottom: 6px; }
    .form-group { margin-bottom: 14px; }
    .form-label { display: block; font-size: 0.8rem; font-weight: 500; color: var(--modal-text-secondary, #4b5563); margin-bottom: 4px; }
    .form-control { 
        width: 100%; 
        height: 32px; 
        padding: 0 10px; 
        font-size: 0.8125rem; 
        border: 1px solid var(--modal-border, #e5e7eb); 
        border-radius: 4px; 
        background-color: var(--modal-surface, #ffffff); 
        transition: border-color 0.2s; 
        color: var(--modal-text, #1f2937);
    }
    .form-control:focus { outline: none; border-color: #2563eb; box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.15); }
    .form-control.error { border-color: #ef4444; background-color: rgba(239, 68, 68, 0.05); }
    .form-control:disabled, .form-control[readonly] { background-color: var(--modal-surface-subtle, #f1f5f9); color: var(--modal-text-muted, #4b5563); cursor: not-allowed; }
    textarea.form-control { height: auto; padding: 8px 10px; min-height: 80px; font-family: 'Inter', sans-serif; }
    
    .form-row { display: flex; gap: 16px; }
    .col-half { flex: 1; }
    .col-third { flex: 1; }

    .modal-footer { padding: 16px 24px; border-top: 1px solid var(--modal-border, #e5e7eb); display: flex; justify-content: space-between; background-color: var(--modal-surface-subtle, #f8fafc); }
    
    .btn { display: inline-flex; align-items: center; gap: 8px; padding: 6px 16px; border-radius: 6px; font-weight: 500; font-size: 0.85rem; cursor: pointer; transition: all 0.2s; border: 1px solid transparent; height: 36px; }
    .btn-outline { background-color: var(--modal-surface, white); border-color: var(--modal-border, #e5e7eb); color: var(--modal-text, #1f2937); }
    .btn-outline:hover { background-color: var(--modal-surface-hover, #f3f4f6); }
    .btn-primary { background-color: #2563eb; color: white; border: none; }
    .btn-primary:hover { background-color: #1d4ed8; }
    .btn:disabled { opacity: 0.6; cursor: not-allowed; }

    /* Strategy Box Colors */
    .strategy-mitigar { background: rgba(239, 68, 68, 0.1); color: #f87171; border-color: rgba(239, 68, 68, 0.3); }
    .strategy-monitorar { background: rgba(245, 158, 11, 0.1); color: #fbbf24; border-color: rgba(245, 158, 11, 0.3); }
    .strategy-aceitar { background: rgba(16, 185, 129, 0.1); color: #34d399; border-color: rgba(16, 185, 129, 0.3); }

    /* Custom Checkbox Pill */
    .compliance-pill {
        font-size: 0.8rem; display: flex; align-items: center; gap: 6px; 
        background: var(--modal-surface, #f8fafc); padding: 4px 10px; border-radius: 15px; 
        border: 1px solid var(--modal-border, #e2e8f0); cursor: pointer; color: var(--modal-text-secondary, #4b5563);
    }
    .compliance-pill.checked { background: rgba(37, 99, 235, 0.15); border-color: #2563eb; color: #818cf8; font-weight: 500; }
`;

const GlobalRiskModal = ({ open, onClose, onSave, riskToEdit, viewMode = false }) => {
    const { enqueueSnackbar } = useSnackbar();
    const [loading, setLoading] = useState(false);
    const [activeStep, setActiveStep] = useState(1);

    // Data Lists
    const [departments, setDepartments] = useState([]);
    const [costCenters, setCostCenters] = useState([]);
    const [assets, setAssets] = useState([]);
    const [users, setUsers] = useState([]);

    // Form State
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        category: 'TI',
        departmentId: '', // Diretoria (OP, FIN, TI)
        costCenterId: '', // Área
        ownerId: '',
        assetId: '',
        probability: '1',
        impact: '1',
        complianceStandards: [] // Array of strings e.g. ['ISO 27001']
    });

    useEffect(() => {
        if (open) {
            Promise.all([
                getDepartments(),
                getCostCenters(),
                getAssets(),
                getUsers()
            ]).then(([depts, ccs, assetsList, usersList]) => {
                setDepartments(depts);
                setCostCenters(ccs);
                setAssets(assetsList);
                setUsers(usersList);
            });

            if (riskToEdit) {
                // Map existing risk data
                setFormData({
                    title: riskToEdit.title || '',
                    description: riskToEdit.description || '',
                    category: riskToEdit.category || 'TI',
                    departmentId: riskToEdit.departmentId || '',
                    costCenterId: riskToEdit.costCenterId || '',
                    ownerId: riskToEdit.ownerId || '',
                    assetId: riskToEdit.assetId || '',
                    probability: mapProbToValue(riskToEdit.probability),
                    impact: mapImpactToValue(riskToEdit.impact),
                    complianceStandards: riskToEdit.complianceStandard ? riskToEdit.complianceStandard.split(',') : []
                });
            } else {
                resetForm();
            }
            setActiveStep(1);
        }
    }, [open, riskToEdit]);

    const resetForm = () => {
        setFormData({
            title: '',
            description: '',
            category: 'TI',
            departmentId: '',
            costCenterId: '',
            ownerId: '',
            assetId: '',
            probability: '1',
            impact: '1',
            complianceStandards: []
        });
    };

    // Calculate Strategy
    const probVal = parseInt(formData.probability);
    const impVal = parseInt(formData.impact);
    const score = probVal * impVal;

    let strategyText = "ACEITAR (Risco Baixo)";
    // STRONG COLORS for visibility
    let strategyStyle = { background: '#bbf7d0', color: '#14532d', borderColor: '#86efac' }; // Green 200/800/300

    if (score >= 6) {
        strategyText = "MITIGAR (Risco Crítico - Plano Obrigatório)";
        strategyStyle = { background: '#fecaca', color: '#7f1d1d', borderColor: '#f87171' }; // Red 200/900/400
    } else if (score >= 3) {
        strategyText = "MONITORAR (Risco Médio)";
        strategyStyle = { background: '#fde68a', color: '#78350f', borderColor: '#fcd34d' }; // Amber 200/900/300
    }

    // Handlers
    const handleChange = (field, value) => {
        setFormData(prev => {
            const updates = { ...prev, [field]: value };

            // Auto-set Owner if Cost Center changes
            if (field === 'costCenterId') {
                const cc = costCenters.find(c => c.id === value);
                if (cc && cc.managerId) {
                    updates.ownerId = cc.managerId;
                }
            }
            return updates;
        });
    };

    const toggleCompliance = (std) => {
        setFormData(prev => {
            const list = prev.complianceStandards.includes(std)
                ? prev.complianceStandards.filter(s => s !== std)
                : [...prev.complianceStandards, std];
            return { ...prev, complianceStandards: list };
        });
    };

    const getManagerName = () => {
        if (!formData.costCenterId) return '';
        const cc = costCenters.find(c => c.id === formData.costCenterId);
        return cc?.manager?.name || 'Não atribuído';
    };

    const filteredCostCenters = formData.departmentId
        ? costCenters.filter(cc => cc.departmentId === formData.departmentId)
        : costCenters;

    const handleSave = async () => {
        if (!formData.title) return enqueueSnackbar('Título é obrigatório', { variant: 'warning' });
        if (!formData.costCenterId) return enqueueSnackbar('Área é obrigatória', { variant: 'warning' });

        setLoading(true);
        try {
            // Map back to API format
            const payload = {
                ...formData,
                probability: mapValueToProb(formData.probability),
                impact: mapValueToImpact(formData.impact),
                complianceStandard: formData.complianceStandards.join(','),
                status: 'IDENTIFICADO', // Default
                treatmentType: score >= 6 ? 'MITIGAR' : (score >= 3 ? 'MONITORAR' : 'ACEITAR')
            };

            // Sanitize optional fields
            if (!payload.departmentId) payload.departmentId = null;
            if (!payload.costCenterId) payload.costCenterId = null;
            if (!payload.assetId) payload.assetId = null;
            if (!payload.ownerId) payload.ownerId = null;

            // Remove internal array (not a schema field)
            delete payload.complianceStandards;

            if (riskToEdit) {
                await updateRisk(riskToEdit.id, payload);
                enqueueSnackbar('Risco atualizado com sucesso', { variant: 'success' });
            } else {
                await createRisk(payload);
                enqueueSnackbar('Risco criado com sucesso', { variant: 'success' });
            }
            if (onSave) onSave();
            onClose();
        } catch (error) {
            console.error(error);
            enqueueSnackbar('Erro ao salvar risco', { variant: 'error' });
        } finally {
            setLoading(false);
        }
    };

    // Mappers
    const mapProbToValue = (p) => {
        const map = { 'MUITO_BAIXA': '1', 'BAIXA': '1', 'MEDIA': '2', 'ALTA': '3', 'MUITO_ALTA': '4' };
        return map[p] || '1';
    };
    const mapImpactToValue = (i) => {
        const map = { 'BAIXO': '1', 'MEDIO': '2', 'ALTO': '3', 'CRITICO': '4' };
        return map[i] || '1';
    };
    const mapValueToProb = (v) => {
        if (v === '1') return 'BAIXA';
        if (v === '2') return 'MEDIA';
        if (v === '3') return 'ALTA';
        return 'MUITO_ALTA';
    };
    const mapValueToImpact = (v) => {
        if (v === '1') return 'BAIXO';
        if (v === '2') return 'MEDIO';
        if (v === '3') return 'ALTO';
        return 'CRITICO';
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth={false}
            PaperProps={{
                className: 'transparent-paper',
                sx: {
                    background: 'transparent !important',
                    backgroundColor: 'transparent !important',
                    backgroundImage: 'none !important',
                    boxShadow: 'none !important',
                    border: 'none !important',
                    borderRadius: '0 !important',
                    overflow: 'visible',
                    padding: 0,
                    margin: 0,
                    maxHeight: '90vh',
                }
            }}
            BackdropProps={{
                sx: {
                    backdropFilter: 'blur(2px)',
                    backgroundColor: 'rgba(0, 0, 0, 0.4)'
                }
            }}
        >
            <style>{modalStyles}</style>
            <div className="modal-window" style={{ position: 'relative' }}>

                {/* Close button — absolute top-right corner */}
                <button className="modal-close" onClick={onClose} style={{
                    position: 'absolute', top: 12, right: 12, zIndex: 10,
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--modal-text-muted, #9ca3af)',
                    width: 32, height: 32, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'background 0.2s',
                }}>
                    <Close sx={{ fontSize: 20 }} />
                </button>

                {/* Header */}
                <div className="modal-header">
                    <div className="modal-top-row">
                        <h3 className="modal-title">{riskToEdit ? 'Editar Risco' : 'Novo Registro de Risco'}</h3>
                    </div>
                    <div className="stepper">
                        <div className={`step ${activeStep === 1 ? 'active' : 'completed'}`} onClick={() => setActiveStep(1)} style={{ cursor: 'pointer' }}>
                            <div className="step-circle">{activeStep > 1 ? <Check sx={{ fontSize: 14 }} /> : '1'}</div>
                            <div className="step-label">IDENTIFICAÇÃO</div>
                        </div>
                        <div className={`step ${activeStep === 2 ? 'active' : ''}`} onClick={() => setActiveStep(2)} style={{ cursor: 'pointer' }}>
                            <div className="step-circle">2</div>
                            <div className="step-label">AVALIAÇÃO</div>
                        </div>
                    </div>
                </div>

                {/* Body */}
                <div className="modal-body">
                    {/* Step 1 */}
                    <div className={`wizard-step ${activeStep === 1 ? 'active' : ''}`}>
                        <div className="form-section-label">O QUE E ONDE</div>

                        <div className="form-group">
                            <label className="form-label">Título do Risco <span style={{ color: 'red' }}>*</span></label>
                            <input
                                type="text"
                                className="form-control"
                                placeholder="Resumo curto do evento de risco"
                                value={formData.title}
                                onChange={e => handleChange('title', e.target.value)}
                                disabled={viewMode}
                            />
                        </div>

                        <div className="form-row">
                            <div className="col-half">
                                <div className="form-group">
                                    <label className="form-label">Diretoria (Filtro)</label>
                                    <select
                                        className="form-control"
                                        value={formData.departmentId}
                                        onChange={e => handleChange('departmentId', e.target.value)}
                                        disabled={viewMode}
                                    >
                                        <option value="">Selecione...</option>
                                        {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="col-half">
                                <div className="form-group">
                                    <label className="form-label">Centro de Custo / Área <span style={{ color: 'red' }}>*</span></label>
                                    <select
                                        className="form-control"
                                        value={formData.costCenterId}
                                        onChange={e => handleChange('costCenterId', e.target.value)}
                                        disabled={viewMode || !formData.departmentId}
                                    >
                                        <option value="">{formData.departmentId ? 'Selecione a área...' : 'Aguardando Diretoria...'}</option>
                                        {filteredCostCenters.map(cc => <option key={cc.id} value={cc.id}>{cc.name}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Gestor Responsável <Lock sx={{ fontSize: 12, marginLeft: '4px', color: '#94a3b8' }} /></label>
                            <input
                                type="text"
                                className="form-control"
                                readOnly
                                placeholder="Preenchimento automático via Área"
                                value={getManagerName()}
                            />
                        </div>

                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Descrição Detalhada</label>
                            <textarea
                                className="form-control"
                                rows={5}
                                style={{ minHeight: 120 }}
                                placeholder="Descreva causa raiz, gatilhos e possíveis consequências..."
                                value={formData.description}
                                onChange={e => handleChange('description', e.target.value)}
                                disabled={viewMode}
                            ></textarea>
                        </div>
                    </div>

                    {/* Step 2 */}
                    <div className={`wizard-step ${activeStep === 2 ? 'active' : ''}`}>
                        <div className="form-section-label">MATRIZ DE RISCO</div>

                        {/* New Category Field */}
                        <div className="form-group">
                            <label className="form-label">Categoria do Risco <span style={{ color: 'red' }}>*</span></label>
                            <select
                                className="form-control"
                                value={formData.category}
                                onChange={e => handleChange('category', e.target.value)}
                                disabled={viewMode}
                            >
                                <option value="TI">Tecnologia da Informação</option>
                                <option value="SEGURANCA">Segurança da Informação</option>
                                <option value="COMPLIANCE">Compliance & Legal</option>
                                <option value="OPERACIONAL">Operacional</option>
                                <option value="FINANCEIRO">Financeiro</option>
                            </select>
                        </div>

                        <div className="form-row">
                            <div className="col-half">
                                <div className="form-group">
                                    <label className="form-label">Probabilidade (P)</label>
                                    <select
                                        className="form-control"
                                        value={formData.probability}
                                        onChange={e => handleChange('probability', e.target.value)}
                                        disabled={viewMode}
                                    >
                                        <option value="1">1 - Baixa (Raro)</option>
                                        <option value="2">2 - Média (Possível)</option>
                                        <option value="3">3 - Alta (Quase Certo)</option>
                                        <option value="4">4 - Muito Alta</option>
                                    </select>
                                </div>
                            </div>
                            <div className="col-half">
                                <div className="form-group">
                                    <label className="form-label">Impacto (I)</label>
                                    <select
                                        className="form-control"
                                        value={formData.impact}
                                        onChange={e => handleChange('impact', e.target.value)}
                                        disabled={viewMode}
                                    >
                                        <option value="1">1 - Baixo</option>
                                        <option value="2">2 - Médio</option>
                                        <option value="3">3 - Alto</option>
                                        <option value="4">4 - Crítico</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Estratégia Recomendada</label>
                            <div
                                style={{
                                    padding: '8px 12px',
                                    borderRadius: '4px',
                                    fontSize: '0.8rem',
                                    fontWeight: 600,
                                    border: '1px solid',
                                    ...strategyStyle
                                }}
                            >
                                {strategyText}
                            </div>
                        </div>

                        <div className="form-section-label" style={{ marginTop: '24px' }}>COMPLIANCE & REGULATÓRIO</div>
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                            {['ISO 9001', 'ISO 27001', 'ISO 20000', 'LGPD', 'GDPR', 'SOX', 'HIPAA', 'PCI-DSS', 'COBIT', 'ITIL'].map(std => (
                                <div
                                    key={std}
                                    className={`compliance-pill ${formData.complianceStandards.includes(std) ? 'checked' : ''}`}
                                    onClick={() => !viewMode && toggleCompliance(std)}
                                >
                                    <input type="checkbox" checked={formData.complianceStandards.includes(std)} readOnly style={{ pointerEvents: 'none' }} />
                                    {std}
                                </div>
                            ))}
                            {/* Custom compliance standards (user-added) */}
                            {formData.complianceStandards
                                .filter(s => !['ISO 9001', 'ISO 27001', 'ISO 20000', 'LGPD', 'GDPR', 'SOX', 'HIPAA', 'PCI-DSS', 'COBIT', 'ITIL'].includes(s))
                                .map(std => (
                                    <div key={std} className="compliance-pill checked" onClick={() => !viewMode && toggleCompliance(std)}>
                                        <input type="checkbox" checked readOnly style={{ pointerEvents: 'none' }} />
                                        {std}
                                    </div>
                                ))
                            }
                            {/* Add custom compliance */}
                            {!viewMode && (
                                <div
                                    className="compliance-pill"
                                    style={{ cursor: 'pointer', borderStyle: 'dashed' }}
                                    onClick={() => {
                                        const custom = prompt('Nome do padrão de compliance:');
                                        if (custom && custom.trim() && !formData.complianceStandards.includes(custom.trim())) {
                                            toggleCompliance(custom.trim());
                                        }
                                    }}
                                >
                                    + Outro
                                </div>
                            )}
                        </div>

                        <div className="form-group" style={{ marginTop: '20px' }}>
                            <label className="form-label">Ativo Relacionado</label>
                            <select
                                className="form-control"
                                value={formData.assetId}
                                onChange={e => handleChange('assetId', e.target.value)}
                                disabled={viewMode}
                            >
                                <option value="">Selecione...</option>
                                {assets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="modal-footer">
                    <button className="btn btn-outline" onClick={onClose}>Cancelar</button>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        {activeStep > 1 && (
                            <button className="btn btn-outline" onClick={() => setActiveStep(prev => prev - 1)}>Voltar</button>
                        )}

                        {activeStep < 2 ? (
                            <button className="btn btn-primary" onClick={() => setActiveStep(prev => prev + 1)}>Próximo</button>
                        ) : (
                            !viewMode && (
                                <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
                                    {loading ? 'Salvando...' : 'Concluir'}
                                </button>
                            )
                        )}
                    </div>
                </div>
            </div>
        </Dialog>
    );
};

export default GlobalRiskModal;
