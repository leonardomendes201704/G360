import { useState, useEffect } from 'react';
import { useSnackbar } from 'notistack';
import { Dialog } from '@mui/material';
import { createFollowUp, updateFollowUp } from '../../services/project-details.service';

const TYPE_OPTIONS = [
    { value: 'STATUS_REPORT', label: 'Status', icon: '📊' },
    { value: 'MEETING', label: 'Reunião', icon: '📹' },
    { value: 'CALL', label: 'Ligação', icon: '📞' },
    { value: 'EMAIL', label: 'E-mail', icon: '📧' },
    { value: 'REVIEW', label: 'Revisão', icon: '📝' },
    { value: 'TASK', label: 'Tarefa', icon: '✅' }
];

const PRIORITY_OPTIONS = [
    { value: 'HIGH', label: 'Alta', icon: '🔴', class: 'red' },
    { value: 'MEDIUM', label: 'Média', icon: '🟡', class: 'yellow' },
    { value: 'LOW', label: 'Baixa', icon: '🟢', class: 'green' }
];

const STATUS_OPTIONS = [
    { value: 'GREEN', label: 'No Prazo', icon: '🟢', class: 'green' },
    { value: 'AMBER', label: 'Atenção', icon: '🟡', class: 'yellow' },
    { value: 'RED', label: 'Crítico', icon: '🔴', class: 'red' }
];

const FollowUpModal = ({ open, onClose, onSave, projectId, followUpToEdit = null, users = [] }) => {
    const { enqueueSnackbar } = useSnackbar();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        type: 'TASK',
        priority: 'MEDIUM',
        dueDate: '',
        dueTime: '09:00',
        assigneeId: '',
        meetingLink: '',
        // Status Report fields
        projectStatus: 'GREEN',
        highlights: '',
        risks: '',
        nextSteps: ''
    });

    const isStatusReport = formData.type === 'STATUS_REPORT';

    useEffect(() => {
        if (open) {
            if (followUpToEdit) {
                const dueDate = followUpToEdit.dueDate ? new Date(followUpToEdit.dueDate) : new Date();
                setFormData({
                    title: followUpToEdit.title || '',
                    description: followUpToEdit.description || '',
                    type: followUpToEdit.type || 'TASK',
                    priority: followUpToEdit.priority || 'MEDIUM',
                    dueDate: dueDate.toISOString().split('T')[0],
                    dueTime: dueDate.toTimeString().substring(0, 5),
                    assigneeId: followUpToEdit.assigneeId || '',
                    meetingLink: followUpToEdit.meetingLink || '',
                    projectStatus: followUpToEdit.status || 'GREEN',
                    highlights: followUpToEdit.highlights || '',
                    risks: followUpToEdit.risks || '',
                    nextSteps: followUpToEdit.nextSteps || ''
                });
            } else {
                const now = new Date();
                setFormData({
                    title: '',
                    description: '',
                    type: followUpToEdit?.type || 'TASK',
                    priority: 'MEDIUM',
                    dueDate: now.toISOString().split('T')[0],
                    dueTime: now.toTimeString().substring(0, 5),
                    assigneeId: '',
                    meetingLink: '',
                    projectStatus: 'GREEN',
                    highlights: '',
                    risks: '',
                    nextSteps: ''
                });
            }
        }
    }, [open, followUpToEdit]);

    const handleSave = async () => {
        if (isStatusReport) {
            if (!formData.highlights.trim()) {
                enqueueSnackbar('As realizações da semana são obrigatórias.', { variant: 'warning' });
                return;
            }
        } else {
            if (!formData.title.trim()) {
                enqueueSnackbar('O título é obrigatório.', { variant: 'warning' });
                return;
            }
        }

        if (!formData.dueDate) {
            enqueueSnackbar('A data é obrigatória.', { variant: 'warning' });
            return;
        }

        setLoading(true);
        try {
            const dueDatetime = new Date(`${formData.dueDate}T${formData.dueTime || '09:00'}`);

            const payload = {
                title: isStatusReport ? `Status Report - ${formData.dueDate}` : formData.title,
                description: formData.description || null,
                type: formData.type,
                priority: formData.priority,
                dueDate: dueDatetime.toISOString(),
                assigneeId: formData.assigneeId || null,
                meetingLink: formData.meetingLink || null,
                status: isStatusReport ? formData.projectStatus : 'PENDING',
                highlights: isStatusReport ? formData.highlights : '',
                risks: isStatusReport ? formData.risks : null,
                nextSteps: isStatusReport ? formData.nextSteps : null
            };

            if (followUpToEdit?.id) {
                await updateFollowUp(projectId, followUpToEdit.id, payload);
                enqueueSnackbar('Follow-up atualizado com sucesso!', { variant: 'success' });
            } else {
                await createFollowUp(projectId, payload);
                enqueueSnackbar('Follow-up criado com sucesso!', { variant: 'success' });
            }
            if (onSave) onSave();
            onClose();
        } catch (e) {
            console.error(e);
            enqueueSnackbar('Erro ao salvar follow-up.', { variant: 'error' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            PaperProps={{
                sx: {
                    background: 'var(--modal-bg)',
                    borderRadius: '16px',
                    border: '1px solid var(--modal-border)',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                    color: 'var(--modal-text)',
                    maxHeight: '90vh',
                    overflow: 'hidden',
                }
            }}
            BackdropProps={{
                sx: {
                    backdropFilter: 'blur(4px)',
                    backgroundColor: 'rgba(0, 0, 0, 0.7)'
                }
            }}
        >
            <div className="modal-container large" style={{ border: 'none', borderRadius: 0, maxHeight: 'none', boxShadow: 'none' }}>
                <div className="modal-header">
                    <div className="modal-icon followup">{isStatusReport ? '📊' : '📋'}</div>
                    <div className="modal-header-info">
                        <h2>{isStatusReport ? 'Status Report Semanal' : (followUpToEdit?.id ? 'Editar Follow-up' : 'Novo Follow-up')}</h2>
                        <p>{isStatusReport ? 'Registre o acompanhamento semanal do projeto' : 'Agende um follow-up para o projeto'}</p>
                    </div>
                    <button className="modal-close" onClick={onClose}>✕</button>
                </div>

                <div className="modal-body">
                    {/* Type Selection */}
                    <div className="form-section">
                        <div className="form-grid">
                            <div className="form-group col-12">
                                <label className="form-label">Tipo de Follow-up <span className="required">*</span></label>
                                <div className="type-options">
                                    {TYPE_OPTIONS.map(opt => (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            className={`type-btn ${formData.type === opt.value ? 'selected' : ''}`}
                                            onClick={() => setFormData({ ...formData, type: opt.value })}
                                        >
                                            <span className="type-icon">{opt.icon}</span>
                                            <span className="type-label">{opt.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* STATUS REPORT FIELDS */}
                    {isStatusReport ? (
                        <>
                            {/* Project Status (Semaphore) */}
                            <div className="form-section">
                                <div className="form-grid">
                                    <div className="form-group col-4">
                                        <label className="form-label">Data do Reporte <span className="required">*</span></label>
                                        <div className="input-with-icon">
                                            <span className="input-icon">📅</span>
                                            <input
                                                type="date"
                                                className="form-input"
                                                value={formData.dueDate}
                                                onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className="form-group col-8">
                                        <label className="form-label">Saúde do Projeto <span className="required">*</span></label>
                                        <div className="health-options">
                                            {STATUS_OPTIONS.map(opt => (
                                                <button
                                                    key={opt.value}
                                                    type="button"
                                                    className={`health-btn ${formData.projectStatus === opt.value ? `selected ${opt.class}` : ''}`}
                                                    onClick={() => setFormData({ ...formData, projectStatus: opt.value })}
                                                >
                                                    <div className="health-icon">{opt.icon}</div>
                                                    <div className="health-label">{opt.label}</div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Highlights */}
                            <div className="form-section">
                                <div className="section-title">Realizações da Semana <span className="required">*</span></div>
                                <div className="form-grid">
                                    <div className="form-group col-12">
                                        <textarea
                                            className="form-textarea"
                                            placeholder="O que foi entregue nesta semana? Quais marcos foram atingidos?"
                                            value={formData.highlights}
                                            onChange={e => setFormData({ ...formData, highlights: e.target.value })}
                                            rows={4}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Risks */}
                            <div className="form-section">
                                <div className="section-title">Riscos e Impedimentos</div>
                                <div className="form-grid">
                                    <div className="form-group col-12">
                                        <textarea
                                            className="form-textarea"
                                            placeholder="Quais problemas ou bloqueios foram identificados?"
                                            value={formData.risks}
                                            onChange={e => setFormData({ ...formData, risks: e.target.value })}
                                            rows={3}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Next Steps */}
                            <div className="form-section">
                                <div className="section-title">Próximos Passos</div>
                                <div className="form-grid">
                                    <div className="form-group col-12">
                                        <textarea
                                            className="form-textarea"
                                            placeholder="O que está planejado para a próxima semana?"
                                            value={formData.nextSteps}
                                            onChange={e => setFormData({ ...formData, nextSteps: e.target.value })}
                                            rows={3}
                                        />
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            {/* SCHEDULED ACTIVITY FIELDS */}
                            {/* Title */}
                            <div className="form-section">
                                <div className="form-grid">
                                    <div className="form-group col-12">
                                        <label className="form-label">Título <span className="required">*</span></label>
                                        <div className="input-with-icon">
                                            <span className="input-icon">📝</span>
                                            <input
                                                type="text"
                                                className="form-input"
                                                placeholder="Ex: Reunião de alinhamento, Call com cliente..."
                                                value={formData.title}
                                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Priority, Date, Time, Assignee */}
                            <div className="form-section">
                                <div className="form-grid">
                                    <div className="form-group col-12">
                                        <label className="form-label">Prioridade</label>
                                        <div className="health-options">
                                            {PRIORITY_OPTIONS.map(opt => (
                                                <button
                                                    key={opt.value}
                                                    type="button"
                                                    className={`health-btn ${formData.priority === opt.value ? `selected ${opt.class}` : ''}`}
                                                    onClick={() => setFormData({ ...formData, priority: opt.value })}
                                                >
                                                    <div className="health-icon">{opt.icon}</div>
                                                    <div className="health-label">{opt.label}</div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="form-section">
                                <div className="form-grid">
                                    <div className="form-group col-4">
                                        <label className="form-label">Data <span className="required">*</span></label>
                                        <div className="input-with-icon">
                                            <span className="input-icon">📅</span>
                                            <input
                                                type="date"
                                                className="form-input"
                                                value={formData.dueDate}
                                                onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className="form-group col-4">
                                        <label className="form-label">Horário</label>
                                        <div className="input-with-icon">
                                            <span className="input-icon">🕐</span>
                                            <input
                                                type="time"
                                                className="form-input"
                                                value={formData.dueTime}
                                                onChange={e => setFormData({ ...formData, dueTime: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className="form-group col-4">
                                        <label className="form-label">Responsável</label>
                                        <select
                                            className="form-select"
                                            value={formData.assigneeId}
                                            onChange={e => setFormData({ ...formData, assigneeId: e.target.value })}
                                        >
                                            <option value="">Selecione...</option>
                                            {users.map(user => (
                                                <option key={user.id} value={user.id}>{user.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Meeting Link (conditional) */}
                            {formData.type === 'MEETING' && (
                                <div className="form-section">
                                    <div className="form-grid">
                                        <div className="form-group col-12">
                                            <label className="form-label">Link da Reunião</label>
                                            <div className="input-with-icon">
                                                <span className="input-icon">🔗</span>
                                                <input
                                                    type="url"
                                                    className="form-input"
                                                    placeholder="https://meet.google.com/..."
                                                    value={formData.meetingLink}
                                                    onChange={e => setFormData({ ...formData, meetingLink: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Description */}
                            <div className="form-section">
                                <div className="section-title">Descrição</div>
                                <div className="form-grid">
                                    <div className="form-group col-12">
                                        <textarea
                                            className="form-textarea"
                                            placeholder="Descreva os detalhes do follow-up..."
                                            value={formData.description}
                                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                                            rows={4}
                                        />
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
                    <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
                        <span>✓</span> {isStatusReport ? 'Registrar Status' : (followUpToEdit?.id ? 'Salvar' : 'Criar Follow-up')}
                    </button>
                </div>
            </div>

            <style>{`
                .type-options {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 8px;
                }
                .type-btn {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 4px;
                    padding: 10px 14px;
                    background: var(--modal-surface-alt);
                    border: 2px solid #334155;
                    border-radius: 12px;
                    cursor: pointer;
                    transition: all 0.2s;
                    min-width: 65px;
                }
                .type-btn:hover {
                    border-color: #2563eb;
                    background: rgba(37, 99, 235, 0.1);
                }
                .type-btn.selected {
                    border-color: #2563eb;
                    background: rgba(37, 99, 235, 0.15);
                }
                .type-icon {
                    font-size: 18px;
                }
                .type-label {
                    font-size: 10px;
                    font-weight: 600;
                    color: var(--modal-text-secondary);
                }
                .type-btn.selected .type-label {
                    color: var(--modal-text);
                }
                .form-select {
                    width: 100%;
                    padding: 12px 16px;
                    border: 1px solid #334155;
                    border-radius: 8px;
                    font-size: 14px;
                    background: var(--modal-surface-alt);
                    color: var(--modal-text);
                }
                .form-select:focus {
                    border-color: #2563eb;
                    outline: none;
                }
                .form-select option {
                    background: var(--modal-surface-alt);
                    color: var(--modal-text);
                }
                .section-title .required {
                    color: #ef4444;
                }
                .health-options {
                    display: flex;
                    gap: 12px;
                }
                .health-btn {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 6px;
                    padding: 14px 16px;
                    background: var(--modal-surface-alt);
                    border: 2px solid #334155;
                    border-radius: 12px;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .health-btn:hover {
                    border-color: #475569;
                }
                .health-btn.selected.red {
                    border-color: #f43f5e;
                    background: rgba(244, 63, 94, 0.15);
                }
                .health-btn.selected.yellow {
                    border-color: #f59e0b;
                    background: rgba(245, 158, 11, 0.15);
                }
                .health-btn.selected.green {
                    border-color: #10b981;
                    background: rgba(16, 185, 129, 0.15);
                }
                .health-icon {
                    font-size: 20px;
                }
                .health-label {
                    font-size: 11px;
                    font-weight: 600;
                    color: var(--modal-text-secondary);
                }
                .health-btn.selected .health-label {
                    color: var(--modal-text);
                }
            `}</style>
        </Dialog>
    );
};

export default FollowUpModal;
