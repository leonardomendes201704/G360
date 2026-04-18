import { useContext } from 'react';
import { Box, Typography, Chip, Button, Divider } from '@mui/material';
import { Edit } from '@mui/icons-material';
import { ThemeContext } from '../../contexts/ThemeContext';
import StatusChip from '../common/StatusChip';
import StandardModal from '../common/StandardModal';

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

function SupplierViewSection({ title, icon, color, borderColor, textPrimary, children }) {
    return (
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
}

function SupplierDataField({ label, value, fullWidth = false, textMuted, textPrimary }) {
    return (
        <Box sx={{ gridColumn: fullWidth ? '1 / -1' : 'auto' }}>
            <Typography sx={{ fontSize: '11px', fontWeight: 600, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.4px', mb: 0.5 }}>{label}</Typography>
            <Typography sx={{ fontSize: '14px', color: textPrimary, fontWeight: 500 }}>{value || '—'}</Typography>
        </Box>
    );
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

    return (
        <StandardModal
            open={open}
            onClose={onClose}
            title={supplier.name}
            subtitle={supplier.tradeName || 'Fornecedor'}
            icon="store"
            size="wide"
            footer={
                <Box sx={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                    <Typography sx={{ fontSize: '11px', color: textMuted }}>
                        {supplier.createdAt && `Cadastrado em ${new Date(supplier.createdAt).toLocaleDateString('pt-BR')}`}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1.5 }}>
                        <Button onClick={onClose} sx={{ color: textSecondary, textTransform: 'none', fontWeight: 600, fontSize: '13px', border: `1px solid ${borderColor}`, borderRadius: '8px', px: 3 }}>
                            Fechar
                        </Button>
                        {onEdit && (
                            <Button onClick={() => onEdit(supplier)} startIcon={<Edit sx={{ fontSize: '16px !important' }} />}
                                variant="contained" color="primary" sx={{ textTransform: 'none', fontWeight: 600, fontSize: '13px', borderRadius: '8px', px: 3 }}>
                                Editar
                            </Button>
                        )}
                    </Box>
                </Box>
            }
            contentSx={{ background: mode === 'dark' ? undefined : '#ffffff' }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', mb: 2 }}>
                <StatusChip status={supplier.status} type="SUPPLIER" />
                {supplier.rating && (
                    <Chip label={RATING_STARS[supplier.rating] || `${supplier.rating}★`} size="small" sx={{ height: 22, fontSize: '11px', bgcolor: surfaceBg, color: '#f59e0b', border: `1px solid ${borderColor}` }} />
                )}
            </Box>

            <SupplierViewSection title="Dados empresariais" icon="business" color="#06b6d4" borderColor={borderColor} textPrimary={textPrimary}>
                <SupplierDataField label="Documento" value={supplier.document} textMuted={textMuted} textPrimary={textPrimary} />
                <SupplierDataField label="Tipo" value={supplier.documentType === 'CNPJ' ? 'Pessoa Jurídica' : supplier.documentType === 'CPF' ? 'Pessoa Física' : 'Exterior'} textMuted={textMuted} textPrimary={textPrimary} />
                <SupplierDataField label="Categoria" value={CATEGORIA_LABELS[supplier.category] || supplier.category} textMuted={textMuted} textPrimary={textPrimary} />
                <SupplierDataField label="Classificação" value={supplier.classification} textMuted={textMuted} textPrimary={textPrimary} />
            </SupplierViewSection>

            <Divider sx={{ borderColor, mb: 3 }} />

            <SupplierViewSection title="Endereço" icon="location_on" color="#3b82f6" borderColor={borderColor} textPrimary={textPrimary}>
                <SupplierDataField label="CEP" value={supplier.zipCode} textMuted={textMuted} textPrimary={textPrimary} />
                <SupplierDataField label="Logradouro" value={supplier.address} fullWidth textMuted={textMuted} textPrimary={textPrimary} />
                <SupplierDataField label="Estado" value={supplier.state} textMuted={textMuted} textPrimary={textPrimary} />
                <SupplierDataField label="Cidade" value={supplier.city} textMuted={textMuted} textPrimary={textPrimary} />
                <SupplierDataField label="País" value={supplier.country} textMuted={textMuted} textPrimary={textPrimary} />
            </SupplierViewSection>

            <Divider sx={{ borderColor, mb: 3 }} />

            <SupplierViewSection title="Contato principal" icon="person" color="#10b981" borderColor={borderColor} textPrimary={textPrimary}>
                <SupplierDataField label="Nome" value={supplier.contactName} textMuted={textMuted} textPrimary={textPrimary} />
                <SupplierDataField label="E-mail" value={supplier.email} textMuted={textMuted} textPrimary={textPrimary} />
                <SupplierDataField label="Telefone" value={supplier.phone} textMuted={textMuted} textPrimary={textPrimary} />
            </SupplierViewSection>

            {(supplier.bankName || supplier.bankAgency || supplier.bankAccount) && (
                <>
                    <Divider sx={{ borderColor, mb: 3 }} />
                    <SupplierViewSection title="Dados bancários" icon="account_balance" color="#f59e0b" borderColor={borderColor} textPrimary={textPrimary}>
                        <SupplierDataField label="Banco" value={bankName} textMuted={textMuted} textPrimary={textPrimary} />
                        <SupplierDataField label="Tipo de conta" value={supplier.bankAccountType === 'CORRENTE' ? 'Conta Corrente' : supplier.bankAccountType === 'POUPANCA' ? 'Conta Poupança' : supplier.bankAccountType} textMuted={textMuted} textPrimary={textPrimary} />
                        <SupplierDataField label="Agência" value={supplier.bankAgency} textMuted={textMuted} textPrimary={textPrimary} />
                        <SupplierDataField label="Conta" value={supplier.bankAccount} textMuted={textMuted} textPrimary={textPrimary} />
                    </SupplierViewSection>
                </>
            )}

            {supplier.notes && (
                <>
                    <Divider sx={{ borderColor, mb: 3 }} />
                    <Box>
                        <Typography sx={{ fontSize: '11px', fontWeight: 700, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', mb: 1 }}>Observações</Typography>
                        <Typography sx={{ fontSize: '14px', color: textSecondary, lineHeight: 1.6, whiteSpace: 'pre-wrap', p: 2, bgcolor: surfaceBg, borderRadius: '8px', border: `1px solid ${borderColor}` }}>
                            {supplier.notes}
                        </Typography>
                    </Box>
                </>
            )}
        </StandardModal>
    );
};

export default SupplierViewModal;
