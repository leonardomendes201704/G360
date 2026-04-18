import { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import {
    Box, Button, Typography, Paper, Tabs, Tab,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    IconButton, Chip
} from '@mui/material';
import {
    ArrowBack, AttachFile, Delete, Download
} from '@mui/icons-material';
import { format } from 'date-fns';

import { getContractById } from '../../services/contract.service';
import {
    getAttachments, uploadAttachment, deleteAttachment,
    getAddendums
} from '../../services/contract-details.service';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import DataListShell from '../../components/common/DataListShell';
import { getErrorMessage } from '../../utils/errorUtils';
import { getFileURL } from '../../utils/urlUtils';
import { AuthContext } from '../../contexts/AuthContext';

const ContractDetailsPage = () => {
    const { hasPermission } = useContext(AuthContext);
    const { id } = useParams();
    const navigate = useNavigate();
    const { enqueueSnackbar } = useSnackbar();

    const [contract, setContract] = useState(null);
    const [tabValue, setTabValue] = useState(0);
    const [attachments, setAttachments] = useState([]);
    const [addendums, setAddendums] = useState([]);

    const [confirmOpen, setConfirmOpen] = useState(false);
    const [deleteId, setDeleteId] = useState(null);

    useEffect(() => { loadData(); }, [id]);

    const loadData = async () => {
        try {
            const c = await getContractById(id);
            setContract(c);
            const [atts, adds] = await Promise.all([getAttachments(id), getAddendums(id)]);
            setAttachments(atts);
            setAddendums(adds);
        } catch (e) { console.error(e); }
    };

    const handleUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
            await uploadAttachment(id, file, 'OUTROS');
            enqueueSnackbar('Arquivo anexado com sucesso', { variant: 'success' });
            loadData();
        } catch (e) {
            enqueueSnackbar(getErrorMessage(e, 'Erro no upload'), { variant: 'error' });
        }
    };

    const handleDeleteAttClick = (attId) => {
        setDeleteId(attId);
        setConfirmOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!deleteId) return;
        try {
            await deleteAttachment(deleteId);
            loadData();
            enqueueSnackbar('Anexo excluído com sucesso.', { variant: 'success' });
            setConfirmOpen(false);
            setDeleteId(null);
        } catch (e) {
            enqueueSnackbar(getErrorMessage(e, 'Erro ao excluir anexo.'), { variant: 'error' });
        }
    };

    if (!contract) return <Box p={3}>Carregando...</Box>;

    return (
        <Box sx={{ p: 3 }}>
            <Button startIcon={<ArrowBack />} onClick={() => navigate('/contracts')} sx={{ mb: 2 }}>Voltar</Button>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 24 }}>
                <div>
                    <Typography variant="h4" fontWeight="bold">{contract.number}</Typography>
                    <Typography variant="subtitle1" color="textSecondary">{contract.description}</Typography>
                </div>
                <Chip label={contract.status} color="primary" />
            </div>

            <Paper sx={{ mb: 3, p: 3 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
                    <div>
                        <Typography variant="caption" color="textSecondary">FORNECEDOR</Typography>
                        <Typography variant="body1" fontWeight="600">{contract.supplier?.name}</Typography>
                    </div>
                    <div>
                        <Typography variant="caption" color="textSecondary">VIGÊNCIA</Typography>
                        <Typography variant="body1" fontWeight="600">
                            {format(new Date(contract.startDate), 'dd/MM/yyyy')} - {format(new Date(contract.endDate), 'dd/MM/yyyy')}
                        </Typography>
                    </div>
                    <div>
                        <Typography variant="caption" color="textSecondary">VALOR TOTAL</Typography>
                        <Typography variant="body1" fontWeight="600" color="success.main">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(contract.value)}
                        </Typography>
                    </div>
                </div>
            </Paper>

            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
                    <Tab label={`Anexos (${attachments.length})`} />
                    <Tab label={`Aditivos (${addendums.length})`} />
                </Tabs>
            </Box>

            {tabValue === 0 && (
                <DataListShell
                    title="Arquivos do Contrato"
                    titleIcon="attach_file"
                    accentColor="#2563eb"
                    count={attachments.length}
                    toolbar={
                        hasPermission('CONTRACTS', 'ATTACH') ? (
                            <>
                                <input type="file" id="att-upload" hidden onChange={handleUpload} />
                                <label htmlFor="att-upload">
                                    <Button component="span" startIcon={<AttachFile />} size="small">Anexar</Button>
                                </label>
                            </>
                        ) : null
                    }
                >
                    <TableContainer component={Paper} elevation={0} sx={{ borderRadius: '8px', boxShadow: 'none' }}>
                    <Table>
                        <TableHead><TableRow><TableCell>Nome</TableCell><TableCell>Data</TableCell><TableCell align="right">Ações</TableCell></TableRow></TableHead>
                        <TableBody>
                            {attachments.map(att => (
                                <TableRow key={att.id}>
                                    <TableCell>{att.fileName}</TableCell>
                                    <TableCell>{format(new Date(att.createdAt), 'dd/MM/yyyy HH:mm')}</TableCell>
                                    <TableCell align="right">
                                        <IconButton href={getFileURL(att.fileUrl)} target="_blank" color="primary"><Download /></IconButton>
                                        {hasPermission('CONTRACTS', 'ATTACH') && (
                                            <IconButton onClick={() => handleDeleteAttClick(att.id)} color="error"><Delete /></IconButton>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    </TableContainer>
                </DataListShell>
            )}

            {tabValue === 1 && (
                <DataListShell
                    title="Histórico de Aditivos"
                    titleIcon="history"
                    accentColor="#2563eb"
                    count={addendums.length}
                >
                    <Box sx={{ px: 3, pb: 3 }}>
                    {addendums.length === 0 ? (
                        <Typography color="textSecondary">Nenhum aditivo registrado.</Typography>
                    ) : (
                        <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
                            {addendums.map(add => (
                                <Box component="li" key={add.id} sx={{ mb: 1 }}>{add.description} - {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(add.valueChange)}</Box>
                            ))}
                        </Box>
                    )}
                    </Box>
                </DataListShell>
            )}

            <ConfirmDialog
                open={confirmOpen}
                onClose={() => setConfirmOpen(false)}
                onConfirm={handleConfirmDelete}
                title="Excluir Anexo"
                content="Tem certeza que deseja excluir este anexo? O arquivo será removido do sistema."
            />
        </Box>
    );
};

export default ContractDetailsPage;