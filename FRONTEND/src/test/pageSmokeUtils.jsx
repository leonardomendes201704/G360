import { render } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { SnackbarProvider } from 'notistack';
import { ThemeContext } from '../contexts/ThemeContext';

const theme = createTheme();

/** Auth para páginas que exigem Super Admin global (ex.: GlobalSettingsPage). */
export const smokeAuthSuperAdmin = {
  user: { id: 'sa', roles: [{ name: 'Super Admin' }], schema: 'public' },
  hasPermission: () => true,
  loading: false
};

/** Utilizador gestor. */
export const smokeAuthManager = {
  user: { id: 'm1', roles: [{ name: 'Gestor' }], schema: 'tenant_a' },
  hasPermission: () => true,
  loading: false
};

/** Colaborador típico. */
export const smokeAuthCollaborator = {
  user: { id: 'c1', roles: [{ name: 'Colaborador' }], schema: 'tenant_a' },
  hasPermission: () => true,
  loading: false
};

const defaultThemeCtx = { mode: 'light', toggleTheme: () => {} };

/**
 * Smoke render: MemoryRouter + Snackbar + MUI Theme + ThemeContext + AuthContext.
 */
export function renderSmoke(ui, { initialEntries = ['/'], authValue = smokeAuthManager, AuthContext } = {}) {
  if (!AuthContext) throw new Error('renderSmoke: pass AuthContext from contexts/AuthContext');
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <SnackbarProvider>
        <ThemeProvider theme={theme}>
          <ThemeContext.Provider value={defaultThemeCtx}>
            <AuthContext.Provider value={authValue}>{ui}</AuthContext.Provider>
          </ThemeContext.Provider>
        </ThemeProvider>
      </SnackbarProvider>
    </MemoryRouter>
  );
}

/**
 * Uma rota declarada (para useParams / rotas aninhadas).
 * @param routePath ex: "/contracts/:id"
 * @param initialPath ex: "/contracts/c1"
 */
export function renderSmokeRoute(element, routePath, initialPath, AuthContext, authValue = smokeAuthManager) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <SnackbarProvider>
        <ThemeProvider theme={theme}>
          <ThemeContext.Provider value={defaultThemeCtx}>
            <AuthContext.Provider value={authValue}>
              <Routes>
                <Route path={routePath} element={element} />
              </Routes>
            </AuthContext.Provider>
          </ThemeContext.Provider>
        </ThemeProvider>
      </SnackbarProvider>
    </MemoryRouter>
  );
}

export { theme };
