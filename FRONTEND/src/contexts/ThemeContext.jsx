import { createContext, useState, useMemo, useEffect } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import darkPremiumTheme from '../theme/darkPremiumTheme';
import lightPremiumTheme from '../theme/lightPremiumTheme';

export const ThemeContext = createContext({
  mode: 'dark',
  toggleTheme: () => { },
});

export const CustomThemeProvider = ({ children }) => {
  // Ler preferência salva ou usar 'dark' como padrão
  const [mode, setMode] = useState(() => {
    const savedMode = localStorage.getItem('g360_theme_mode');
    return savedMode || 'light';
  });

  // Atualizar tema ativo quando o mode mudar
  const theme = useMemo(() => {
    return mode === 'light' ? lightPremiumTheme : darkPremiumTheme;
  }, [mode]);

  // Função para alternar o tema
  const toggleTheme = () => {
    setMode((prevMode) => {
      const newMode = prevMode === 'light' ? 'dark' : 'light';
      localStorage.setItem('g360_theme_mode', newMode);
      return newMode;
    });
  };

  // Efeito para injetar a classe no body para controlar o CSS global
  useEffect(() => {
    // Remove classes antigas
    document.body.classList.remove('dark-premium-theme', 'light-premium-theme');

    // Adiciona classe nova
    const themeClass = mode === 'light' ? 'light-premium-theme' : 'dark-premium-theme';
    document.body.classList.add(themeClass);

    // Se for dark, garantir fundo dark no body via style inline para evitar flash
    if (mode === 'dark') {
      document.body.style.backgroundColor = '#0f172a';
    } else {
      document.body.style.backgroundColor = '#f8fafc';
    }

  }, [mode]);

  const contextValue = useMemo(() => ({
    mode,
    toggleTheme,
  }), [mode]);

  return (
    <ThemeContext.Provider value={contextValue}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeContext.Provider>
  );
};
