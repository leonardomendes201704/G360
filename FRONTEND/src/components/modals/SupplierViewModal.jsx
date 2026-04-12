import { useContext } from 'react';
import { Dialog, Box, Typography, Chip, IconButton, Button, Divider } from '@mui/material';
import { Close, Edit } from '@mui/icons-material';
import { ThemeContext } from '../../contexts/ThemeContext';
import StatusChip from '../common/StatusChip';

const CATEGORIA_LABELS = {
    TECNOLOGIA: 'Tecnologia', SERVICOS: 'Serviços', INFRAESTRUTURA: 'Infraestrutura',
    CONSULTORIA: 'Consultoria', MARKETING: 'Marketing', LOGISTICA: 'Logística',
    ERP_NEGOCIOS: 'ERP & Negócios', INFRA_SEGURANCA: 'Infraestrutura e Segurança',
    INFRA_CLOUD: 'Infraestrutura e Cloud', TELECOM: 'Telecom', OUTSOURCING: 'Outsourcing'
};

const BANCO_LABELS = {
    '001': 'Banco do Brasil', '104': 'Caixa Econômica Federal',
    '237': 'Bradesco', '341': 'Itaú', '033': 'Santander'
};

const RATING_STARS = { 5: '⭐⭐⭐⭐⭐ Excelente', 4: '⭐⭐⭐⭐ Muito Bom', 3: '⭐⭐⭐ Bom', 2: '⭐⭐ Regular', 1: '⭐ Ruim' };

function formatDate(dateStr) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('pt-BR');
}

const SupplierViewModal = ({ open, onClose, supplier, onEdit }) => {
    const { mode } = useContext(ThemeContext);
    const isDark = mode === 'dark';

    const textPrimary = isDark ? '#f1f5f9' : '#1e293b';
    const textSecondary = isDark ? '#94a3b8' : '#64748b';
    const textMuted = isDark ? '#64748b' : '#94a3b8';
    const surfaceBg = isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc';
    const borderColor = isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0';

    if (!open || !supplier) return null;

    const bankName = BANCO_LABELS[supplier.bankName] || supplier.bankName || '—';

    const Section = ({ title, icon, color, children }) => (
        <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, pb: 1, borderBottom: `1px solid ${borderColor}` }}>
                <span className="material-icons-round" style={{ fontSize: '18px', color }}>{icon}</span>
                <Typography sx={{ fontSize: '14px', fontWeight: 700, color: textPrimary, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{title}</Typography>
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.5 }}>
                {children}
            </Box>
        </Box>
    );

    const DataField = ({ label, value, fullWidth = false }) => (
        <Box sx={{ gridColumn: fullWidth ? '1 / -1' : 'auto' }}>
            <Typography sx={{ fontSize: '11px', fontWeight: 600, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.4px', mb: 0.5 }}>{label}</Typography>
            <Typography sx={{ fontSize: '14px', color: textPrimary, fontWeight: 500 }}>{value || '—'}</Typography>
        </Box>
    );

    return (
        <Dialog open={true} onClose={onClose} maxWidth={false}
            PaperProps={{ sx: { background: isDark ? '#0f172a' : '#ffffff', border: `1px solid ${borderColor}`, borderRadius: '16px', width: '90%', maxWidth: '860px', maxHeight: '90vh', overflow: 'hidden', boxShadow: '0 24px 48px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', color: textPrimary } }}
            BackdropProps={{ sx: { backdropFilter: 'blur(4px)', backgroundColor: 'rgba(0,0,0,0.7)' } }}
        >
            {/* Header */}
            <Box sx={{ p: 3.5, borderBottom: `1px solid ${borderColor}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: surfaceBg }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ width: 48, height: 48, borderRadius: '12px', background: 'rgba(6,182,212,0.15)', border: '1px solid rgba(6,182,212,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span className="material-icons-round" style={{ fontSize: '24px', color: '#06b6d4' }}>store</span>
                    </Box>
                    <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                            <Typography sx={{ fontSize: '20px', fontWeight: 700, color: textPrimary }}>{supplier.name}</Typography>
                            <StatusChip status={supplier.status} type="SUPPLIER" />
                            {supplier.rating && <Chip label={RATING_STARS[supplier.rating] || `${supplier.rating}★`} size="small" sx={{ height: 22, fontSize: '11px', bgcolor: surfaceBg, color: '#f59e0b', border: `1px solid ${borderColor}` }} />}
                        </Box>
                        {supplier.tradeName && <Typography sx={{ fontSize: '14px', color: textSecondary }}>{supplier.tradeName}</Typography>}
                    </Box>
                </Box>
                <IconButton onClick={onClose} sx={{ color: textMuted }}><Close /></IconButton>
            </Box>

            {/* Body */}
            <Box sx={{ flex: 1, overflowY: 'auto', p: 3.5 }}>

                <Section title="Dados Empresariais" icon="business" color="#06b6d4">
                    <DataField label="Documento" value={supplier.document} />
                    <DataField label="Tipo" value={supplier.documentType === 'CNPJ' ? 'Pessoa Jurídica' : supplier.documentType === 'CPF' ? 'Pessoa Física' : 'Exterior'} />
                    <DataField label="Categoria" value={CATEGORIA_LABELS[supplier.category] || supplier.category} />
                    <DataField label="Classificação" value={supplier.classification} />
                </Section>

                <Divider sx={{ borderColor, mb: 3 }} />

                <Section title="Endereço" icon="location_on" color="#3b82f6">
                    <DataField label="CEP" value={supplier.zipCode} />
                    <DataField label="Logradouro" value={supplier.address} fullWidth />
                    <DataField label="Estado" value={supplier.state} />
                    <DataField label="Cidade" value={supplier.city} />
                    <DataField label="País" value={supplier.country} />
                </Section>

                <Divider sx={{ borderColor, mb: 3 }} />

                <Section title="Contato Principal" icon="person" color="#10b981">
                    <DataField label="Nome" value={supplier.contactName} />
                    <DataField label="E-mail" value={supplier.email} />
                    <DataField label="Telefone" value={supplier.phone} />
                </Section>

                {(supplier.bankName || supplier.bankAgency || supplier.bankAccount) && (
                    <>
                        <Divider sx={{ borderColor, mb: 3 }} />
                        <Section title="Dados Bancários" icon="account_balance" color="#f59e0b">
                            <DataField label="Banco" value={bankName} />
                            <DataField label="Tipo de Conta" value={supplier.bankAccountType === 'CORRENTE' ? 'Conta Corrente' : supplier.bankAccountType === 'POUPANCA' ? 'Conta Poupança' : supplier.bankAccountType} />
                            <DataField label="Agência" value={supplier.bankAgency} />
                            <DataField label="Conta" value={supplier.bankAccount} />
                        </Section>
                    </>
                )}

                {supplier.notes && (
                    <>
                        <Divider sx={{ borderColor, mb: 3 }} />
                        <Box>
                            <Typography sx={{ fontSize: '11px', fontWeight: 700, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', mb: 1 }}>Observações</Typography>
                            <Typography sx={{ fontSize: '14px', color: textSecondary, lineHeight: 1.6, whiteSpace: 'pre-wrap', p: 2, bgcolor: surfaceBg, borderRadius: '10px', border: `1px solid ${borderColor}` }}>
                                {supplier.notes}
                            </Typography>
                        </Box>
                    </>
                )}
            </Box>

            {/* Footer */}
            <Box sx={{ p: 2, px: 3.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px solid ${borderColor}`, background: surfaceBg }}>
                <Typography sx={{ fontSize: '11px', color: textMuted }}>
                    {supplier.createdAt && `Cadastrado em ${new Date(supplier.createdAt).toLocaleDateString('pt-BR')}`}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1.5 }}>
                    <Button onClick={onClose} sx={{ color: textSecondary, textTransform: 'none', fontWeight: 600, fontSize: '13px', border: `1px solid ${borderColor}`, borderRadius: '8px', px: 3 }}>Fechar</Button>
                    {onEdit && (
                        <Button onClick={() => onEdit(supplier)} startIcon={<Edit sx={{ fontSize: '16px !important' }} />}
                            sx={{ background: 'linear-gradient(135deg, #06b6d4 0%, #2563eb 100%)', color: '#fff', textTransform: 'none', fontWeight: 600, fontSize: '13px', borderRadius: '8px', px: 3, '&:hover': { boxShadow: '0 4px 12px rgba(6,182,212,0.3)' } }}>
                            Editar
                        </Button>
                    )}
                </Box>
            </Box>
        </Dialog>
    );
};

export default SupplierViewModal;
