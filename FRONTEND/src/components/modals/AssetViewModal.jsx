import { useState, useEffect, useContext } from 'react';
import { Dialog, Box, Typography, Chip, IconButton, Button, Divider } from '@mui/material';
import { Close, Edit } from '@mui/icons-material';
import { ThemeContext } from '../../contexts/ThemeContext';
import StatusChip from '../common/StatusChip';
import { getMaintenances } from '../../services/asset-maintenance.service';
import { format } from 'date-fns';

const STATUS_LABELS = { PROPRIO: 'Próprio', LOCADO: 'Locado / Leasing', MANUTENCAO: 'Em Manutenção', DESATIVADO: 'Desativado' };
const LICENSE_TYPE_LABELS = { ASSINATURA: 'Assinatura (SaaS)', PERPETUA: 'Perpétua', OEM: 'OEM', VOLUME: 'Volume' };

function formatDate(dateStr) {
    if (!dateStr) return '—';
    try { return format(new Date(dateStr), 'dd/MM/yyyy'); } catch { return '—'; }
}

function formatCurrency(val) {
    if (!val && val !== 0) return '—';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
}

const AssetViewModal = ({ open, onClose, asset, onEdit }) => {
    const { mode } = useContext(ThemeContext);
    const isDark = mode === 'dark';
    const [activeTab, setActiveTab] = useState(0);
    const [maintenances, setMaintenances] = useState([]);

    const textPrimary = isDark ? '#f1f5f9' : '#1e293b';
    const textSecondary = isDark ? '#94a3b8' : '#64748b';
    const textMuted = isDark ? '#64748b' : '#94a3b8';
    const surfaceBg = isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc';
    const borderColor = isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0';

    useEffect(() => {
        if (open && asset?.id && !asset.licenseType) {
            getMaintenances(asset.id).then(setMaintenances).catch(() => setMaintenances([]));
            setActiveTab(0);
        }
    }, [open, asset?.id]);

    if (!open || !asset) return null;

    const isLicense = !!asset.licenseType;

    const DataField = ({ label, value, icon, fullWidth = false, mono = false }) => (
        <Box sx={{ p: 1.5, borderRadius: '10px', background: surfaceBg, border: `1px solid ${borderColor}`, gridColumn: fullWidth ? '1 / -1' : 'auto', minHeight: 56 }}>
            <Typography sx={{ fontSize: '10px', fontWeight: 700, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                {icon && <span style={{ fontSize: '12px' }}>{icon}</span>}{label}
            </Typography>
            <Typography sx={{ fontSize: '14px', color: textPrimary, fontWeight: 500, fontFamily: mono ? 'monospace' : 'inherit' }}>
                {value || '—'}
            </Typography>
        </Box>
    );

    const StatusBadge = ({ status }) => {
        const colors = { PROPRIO: '#10b981', LOCADO: '#3b82f6', MANUTENCAO: '#f59e0b', DESATIVADO: '#94a3b8' };
        return <Chip label={STATUS_LABELS[status] || status} size="small" sx={{ height: 22, fontSize: '11px', fontWeight: 600, bgcolor: `${colors[status] || '#94a3b8'}20`, color: colors[status] || '#94a3b8' }} />;
    };

    return (
        <Dialog open={true} onClose={onClose} maxWidth="md" fullWidth
            PaperProps={{ sx: { background: isDark ? '#0f172a' : '#ffffff', borderRadius: '16px', border: `1px solid ${borderColor}`, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', color: textPrimary, maxHeight: '90vh', display: 'flex', flexDirection: 'column' } }}
            BackdropProps={{ sx: { backdropFilter: 'blur(8px)', backgroundColor: 'rgba(0,0,0,0.7)' } }}
        >
            {/* Header */}
            <Box sx={{ p: 3, borderBottom: `1px solid ${borderColor}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: surfaceBg }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ width: 48, height: 48, borderRadius: '12px', background: isLicense ? 'rgba(59,130,246,0.15)' : 'rgba(37,99,235,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span className="material-icons-round" style={{ fontSize: '24px', color: isLicense ? '#3b82f6' : '#2563eb' }}>
                            {isLicense ? 'key' : 'computer'}
                        </span>
                    </Box>
                    <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                            {!isLicense && asset.code && <Typography sx={{ fontSize: '13px', fontWeight: 600, color: textMuted, fontFamily: 'monospace' }}>{asset.code}</Typography>}
                            <Typography sx={{ fontSize: '18px', fontWeight: 700, color: textPrimary }}>{asset.name}</Typography>
                            {!isLicense && asset.status && <StatusBadge status={asset.status} />}
                            {isLicense && <Chip label="Licença de Software" size="small" sx={{ height: 22, fontSize: '11px', bgcolor: 'rgba(59,130,246,0.15)', color: '#3b82f6' }} />}
                        </Box>
                        <Typography sx={{ fontSize: '13px', color: textSecondary }}>
                            {isLicense ? `${asset.vendor} · ${LICENSE_TYPE_LABELS[asset.licenseType] || asset.licenseType}` : (asset.category?.name || 'Sem categoria')}
                        </Typography>
                    </Box>
                </Box>
                <IconButton onClick={onClose} sx={{ color: textMuted }}><Close /></IconButton>
            </Box>

            {/* Tabs — só para hardware */}
            {!isLicense && (
                <Box sx={{ display: 'flex', borderBottom: `1px solid ${borderColor}` }}>
                    {[
                        { label: 'Dados Gerais', icon: 'info' },
                        { label: `Manutenções (${maintenances.length})`, icon: 'build' }
                    ].map((tab, i) => (
                        <Box key={i} onClick={() => setActiveTab(i)} sx={{
                            flex: 1, py: 1.5, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1,
                            fontSize: '13px', fontWeight: 600, color: activeTab === i ? '#2563eb' : textSecondary,
                            borderBottom: activeTab === i ? '2px solid #2563eb' : '2px solid transparent',
                            transition: 'all 0.2s', '&:hover': { color: textPrimary }
                        }}>
                            <span className="material-icons-round" style={{ fontSize: '16px' }}>{tab.icon}</span>
                            {tab.label}
                        </Box>
                    ))}
                </Box>
            )}

            {/* Body */}
            <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>

                {/* HARDWARE — Tab 0 */}
                {!isLicense && activeTab === 0 && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.5 }}>
                            <DataField label="Código" value={asset.code} icon="🔖" mono />
                            <DataField label="Serial Number" value={asset.serialNumber} icon="🔢" mono />
                            <DataField label="Localização" value={asset.location} icon="📍" />
                        </Box>
                        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.5 }}>
                            <DataField label={asset.status === 'LOCADO' ? 'Início da Locação' : 'Data Aquisição'} value={formatDate(asset.acquisitionDate)} icon="📅" />
                            <DataField label={asset.status === 'LOCADO' ? 'Valor Mensal' : 'Valor Aquisição'} value={formatCurrency(asset.status === 'LOCADO' ? asset.rentValue : asset.acquisitionValue)} icon="💰" />
                            <DataField label="Categoria" value={asset.category?.name} icon="📂" />
                        </Box>
                        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.5 }}>
                            <DataField label="Fornecedor" value={asset.supplier?.name} icon="🏢" />
                            <DataField label="Contrato" value={asset.contract ? `${asset.contract.number || ''} ${asset.contract.description || ''}`.trim() : '—'} icon="📄" />
                            <DataField label="Centro de Custo" value={asset.costCenter?.code} icon="🏷️" />
                        </Box>
                    </Box>
                )}

                {/* HARDWARE — Tab 1 (Manutenções) */}
                {!isLicense && activeTab === 1 && (
                    <Box>
                        {maintenances.length === 0 ? (
                            <Box sx={{ textAlign: 'center', py: 6, color: textMuted }}>
                                <Typography>Nenhuma manutenção registrada.</Typography>
                            </Box>
                        ) : (
                            <Box sx={{ background: surfaceBg, borderRadius: '10px', overflow: 'hidden', border: `1px solid ${borderColor}` }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ background: isDark ? 'rgba(0,0,0,0.3)' : '#f1f5f9' }}>
                                            {['Data', 'Tipo', 'Descrição', 'Status', 'Custo'].map(h => (
                                                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: textMuted, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {maintenances.map((m, i) => (
                                            <tr key={m.id} style={{ borderTop: `1px solid ${borderColor}`, background: i % 2 === 0 ? 'transparent' : (isDark ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.01)') }}>
                                                <td style={{ padding: '10px 14px', color: textSecondary, fontSize: '13px' }}>{formatDate(m.startDate)}</td>
                                                <td style={{ padding: '10px 14px' }}>
                                                    <span style={{ padding: '3px 8px', background: 'rgba(37,99,235,0.15)', color: '#2563eb', borderRadius: '6px', fontSize: '11px', fontWeight: 600 }}>{m.type}</span>
                                                </td>
                                                <td style={{ padding: '10px 14px', color: textPrimary, fontSize: '13px' }}>{m.description}</td>
                                                <td style={{ padding: '10px 14px', color: textSecondary, fontSize: '13px' }}>{m.status}</td>
                                                <td style={{ padding: '10px 14px', color: textPrimary, fontSize: '13px', fontWeight: 600 }}>{formatCurrency(m.cost)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </Box>
                        )}
                    </Box>
                )}

                {/* LICENSE */}
                {isLicense && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.5 }}>
                            <DataField label="Fabricante" value={asset.vendor} icon="🏢" />
                            <DataField label="Tipo" value={LICENSE_TYPE_LABELS[asset.licenseType] || asset.licenseType} icon="📋" />
                            <DataField label="Quantidade" value={asset.quantity} icon="🔢" />
                        </Box>
                        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.5 }}>
                            <DataField label="Custo Unitário" value={formatCurrency(asset.cost)} icon="💰" />
                            <DataField label="Data de Compra" value={formatDate(asset.purchaseDate)} icon="📅" />
                            <DataField label="Expiração" value={formatDate(asset.expirationDate)} icon="⏰" />
                        </Box>
                        {asset.licenseKey && <DataField label="Chave de Ativação" value={asset.licenseKey} icon="🔑" mono fullWidth />}
                        {asset.notes && <DataField label="Observações" value={asset.notes} icon="📝" fullWidth />}
                    </Box>
                )}
            </Box>

            {/* Footer */}
            <Box sx={{ p: 2, px: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px solid ${borderColor}`, background: surfaceBg }}>
                <Typography sx={{ fontSize: '11px', color: textMuted }}>
                    {asset.createdAt && `Cadastrado em ${formatDate(asset.createdAt)}`}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1.5 }}>
                    <Button onClick={onClose} sx={{ color: textSecondary, textTransform: 'none', fontWeight: 600, fontSize: '13px', border: `1px solid ${borderColor}`, borderRadius: '8px', px: 3 }}>Fechar</Button>
                    {onEdit && (
                        <Button onClick={() => onEdit(asset)} startIcon={<Edit sx={{ fontSize: '16px !important' }} />}
                            sx={{ background: isLicense ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' : 'linear-gradient(135deg, #2563eb 0%, #06b6d4 100%)', color: '#fff', textTransform: 'none', fontWeight: 600, fontSize: '13px', borderRadius: '8px', px: 3, '&:hover': { boxShadow: '0 4px 12px rgba(37,99,235,0.3)' } }}>
                            Editar
                        </Button>
                    )}
                </Box>
            </Box>
        </Dialog>
    );
};

export default AssetViewModal;
