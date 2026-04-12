import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { AuthContext } from '../contexts/AuthContext';

const defaultTheme = createTheme();

const defaultUser = {
    id: 'test-user-1',
    name: 'Test User',
    email: 'test@g360.com.br',
    tenantId: 'tenant-1',
    roles: [{ name: 'Super Admin', permissions: [{ module: 'ALL', action: 'ALL' }] }],
};

const defaultAuth = {
    user: defaultUser,
    token: 'mock-token',
    login: async () => { },
    logout: () => { },
    loading: false,
    hasRole: () => true,
};

export function TestWrapper({ children, user, auth, route = '/' }) {
    const authValue = auth || { ...defaultAuth, user: user || defaultUser };
    return (
        <MemoryRouter initialEntries={[route]}>
            <ThemeProvider theme={defaultTheme}>
                <AuthContext.Provider value={authValue}>
                    {children}
                </AuthContext.Provider>
            </ThemeProvider>
        </MemoryRouter>
    );
}

export { defaultUser, defaultAuth };
