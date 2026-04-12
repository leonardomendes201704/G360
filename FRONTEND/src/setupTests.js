import { vi } from 'vitest';
import '@testing-library/jest-dom';
import React from 'react';

// Mock global AuthContext to provide default values and prevent undefined destructuring errors
vi.mock('./contexts/AuthContext', () => {
    const mockContext = React.createContext({
        user: { id: 'test-user', name: 'Test User', email: 'test@example.com', roles: [{ name: 'Admin' }] },
        hasPermission: () => true,
        login: vi.fn(),
        logout: vi.fn()
    });
    return { AuthContext: mockContext };
});

// Mock global ThemeContext
vi.mock('./contexts/ThemeContext', () => {
    const mockThemeContext = React.createContext({
        mode: 'light',
        toggleTheme: vi.fn()
    });
    return { ThemeContext: mockThemeContext };
});

// Mock react-router-dom to prevent useNavigate errors
vi.mock('react-router-dom', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        useNavigate: () => vi.fn(),
        useParams: () => ({ id: '123' }),
        useLocation: () => ({ pathname: '/' }),
    };
});
