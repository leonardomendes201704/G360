import React, { useState, useEffect } from 'react';
import { TextField, Button, Autocomplete, Box } from '@mui/material';
import StandardModal from '../common/StandardModal';
import departmentService from '../../services/department.service';
import userService from '../../services/user.service';

const DEPARTMENT_FORM_ID = 'department-form';

const DepartmentModal = ({ open, onClose, onSuccess, editData }) => {
    const [formData, setFormData] = useState({ name: '', code: '', budget: '', directorId: null });
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open) {
            loadUsers();
            if (editData) {
                setFormData({
                    name: editData.name,
                    code: editData.code,
                    budget: editData.budget || '',
                    directorId: editData.director?.id || editData.directorId || null,
                });
            } else {
                setFormData({ name: '', code: '', budget: '', directorId: null });
            }
        }
    }, [open, editData]);

    const loadUsers = async () => {
        try {
            const data = await userService.getAll();
            setUsers(data);
        } catch (error) {
            console.error('Erro ao carregar usuários', error);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload = { ...formData, budget: formData.budget ? Number(formData.budget) : null };
            if (editData) {
                await departmentService.update(editData.id, payload);
            } else {
                await departmentService.create(payload);
            }
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Erro ao salvar departamento', error);
            alert('Erro ao salvar departamento. Verifique os dados.');
        } finally {
            setLoading(false);
        }
    };

    const title = editData ? 'Editar Diretoria' : 'Nova Diretoria';

    return (
        <StandardModal
            open={open}
            onClose={onClose}
            title={title}
            subtitle="Dados da diretoria e orçamento"
            icon="corporate_fare"
            size="form"
            loading={loading}
            footer={
                <>
                    <Button type="button" onClick={onClose} disabled={loading}>
                        Cancelar
                    </Button>
                    <Button
                        type="submit"
                        form={DEPARTMENT_FORM_ID}
                        variant="contained"
                        color="primary"
                        disabled={loading}
                        sx={{ textTransform: 'none', fontWeight: 600 }}
                    >
                        Salvar
                    </Button>
                </>
            }
        >
            <form id={DEPARTMENT_FORM_ID} onSubmit={handleSubmit}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                    <TextField
                        name="name"
                        label="Nome da Diretoria"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        fullWidth
                        placeholder="Ex: Tecnologia da Informação"
                    />
                    <TextField
                        name="code"
                        label="Código (Sigla)"
                        value={formData.code}
                        onChange={handleChange}
                        required
                        fullWidth
                        placeholder="Ex: TI"
                    />
                    <Autocomplete
                        options={users}
                        getOptionLabel={(option) => option.name || ''}
                        isOptionEqualToValue={(a, b) => a?.id === b?.id}
                        value={users.find((u) => u.id === formData.directorId) || null}
                        onChange={(_, newValue) => {
                            setFormData((prev) => ({ ...prev, directorId: newValue ? newValue.id : null }));
                        }}
                        renderInput={(params) => (
                            <TextField {...params} label="Diretor Responsável" placeholder="Selecione..." />
                        )}
                    />
                    <TextField
                        name="budget"
                        label="Teto Orçamental (Anual)"
                        type="number"
                        value={formData.budget}
                        onChange={handleChange}
                        fullWidth
                        helperText="Opcional. Use para relatórios de previsto vs realizado."
                    />
                </Box>
            </form>
        </StandardModal>
    );
};

export default DepartmentModal;
