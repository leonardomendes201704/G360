import React, { useState, useEffect } from 'react';
import { TextField, Button, Checkbox, FormControlLabel, Box, Autocomplete } from '@mui/material';
import StandardModal from '../common/StandardModal';
import costCenterService from '../../services/cost-center.service';
import departmentService from '../../services/department.service';
import userService from '../../services/user.service';

const COST_CENTER_FORM_ID = 'cost-center-form';

const CostCenterModal = ({ open, onClose, onSuccess, editData }) => {
    const [formData, setFormData] = useState({
        code: '',
        name: '',
        isActive: true,
        departmentId: null,
        managerId: null,
    });
    const [departments, setDepartments] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open) {
            loadDependencies();
            if (editData) {
                setFormData({
                    code: editData.code,
                    name: editData.name,
                    isActive: editData.isActive,
                    departmentId: editData.department?.id || editData.departmentId || null,
                    managerId: editData.manager?.id || editData.managerId || null,
                });
            } else {
                setFormData({ code: '', name: '', isActive: true, departmentId: null, managerId: null });
            }
        }
    }, [open, editData]);

    const loadDependencies = async () => {
        try {
            const [deps, usrs] = await Promise.all([departmentService.getAll(), userService.getAll()]);
            setDepartments(deps);
            setUsers(usrs);
        } catch (error) {
            console.error('Erro ao carregar dependências', error);
        }
    };

    const handleChange = (e) => {
        const { name, value, checked, type } = e.target;
        setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (editData) {
                await costCenterService.update(editData.id, formData);
            } else {
                await costCenterService.create(formData);
            }
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Erro ao salvar centro de custo', error);
            alert('Erro ao salvar. Verifique se o código já existe.');
        } finally {
            setLoading(false);
        }
    };

    const title = editData ? 'Editar Centro de Custo' : 'Novo Centro de Custo';

    return (
        <StandardModal
            open={open}
            onClose={onClose}
            title={title}
            subtitle="Vínculos e estado"
            icon="account_balance"
            size="form"
            loading={loading}
            footer={
                <>
                    <Button type="button" onClick={onClose} disabled={loading}>
                        Cancelar
                    </Button>
                    <Button
                        type="submit"
                        form={COST_CENTER_FORM_ID}
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
            <form id={COST_CENTER_FORM_ID} onSubmit={handleSubmit}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                    <TextField
                        name="code"
                        label="Código"
                        value={formData.code}
                        onChange={handleChange}
                        required
                        fullWidth
                        placeholder="Ex: CC-001"
                    />
                    <TextField
                        name="name"
                        label="Nome"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        fullWidth
                        placeholder="Ex: Infraestrutura TI"
                    />
                    <Autocomplete
                        options={departments}
                        getOptionLabel={(option) => option.name || ''}
                        isOptionEqualToValue={(a, b) => a?.id === b?.id}
                        value={departments.find((d) => d.id === formData.departmentId) || null}
                        onChange={(_, newValue) => {
                            setFormData((prev) => ({ ...prev, departmentId: newValue ? newValue.id : null }));
                        }}
                        renderInput={(params) => (
                            <TextField {...params} label="Diretoria vinculada" placeholder="Selecione..." />
                        )}
                    />
                    <Autocomplete
                        options={users}
                        getOptionLabel={(option) => option.name || ''}
                        isOptionEqualToValue={(a, b) => a?.id === b?.id}
                        value={users.find((u) => u.id === formData.managerId) || null}
                        onChange={(_, newValue) => {
                            setFormData((prev) => ({ ...prev, managerId: newValue ? newValue.id : null }));
                        }}
                        renderInput={(params) => (
                            <TextField {...params} label="Gestor responsável" placeholder="Selecione..." />
                        )}
                    />
                    <FormControlLabel
                        control={
                            <Checkbox checked={formData.isActive} onChange={handleChange} name="isActive" />
                        }
                        label="Centro de custo ativo"
                    />
                </Box>
            </form>
        </StandardModal>
    );
};

export default CostCenterModal;
