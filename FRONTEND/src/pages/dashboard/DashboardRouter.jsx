
import React, { useContext } from 'react';
import MasterDashboard from '../admin/MasterDashboard';
import ManagerOverview from './ManagerOverview';
import CollaboratorOverview from './CollaboratorOverview';
import { AuthContext } from '../../contexts/AuthContext';

/**
 * Mesmos arrays do backend access-scope.js — Finance/Financeiro → CollaboratorOverview
 */
const MANAGER_ROLE_NAMES = ['Manager', 'Gestor', 'Gerente'];
const ADMIN_ROLE_NAMES = ['Super Admin', 'Admin', 'Company Admin'];

const hasManagerAccess = (user) => {
    if (!user) return false;
    return (user.roles || []).some(r =>
        MANAGER_ROLE_NAMES.includes(r.name) || ADMIN_ROLE_NAMES.includes(r.name)
    );
};

const DashboardRouter = () => {
    const { user } = useContext(AuthContext);
    const roles = user?.roles || [];
    const roleNames = roles.map(r => r.name);
    
    // O MasterDashboard só é renderizado pro Super Admin da Matriz G360
    const isGlobalSuperAdmin = roleNames.includes('Super Admin') && user?.schema === 'public';

    if (isGlobalSuperAdmin) return <MasterDashboard />;
    return hasManagerAccess(user) ? <ManagerOverview /> : <CollaboratorOverview />;
};

export default DashboardRouter;
