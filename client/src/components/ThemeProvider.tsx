import { createContext, useContext, useEffect, ReactNode } from 'react';
import { useTheme, type Theme } from '@/hooks/use-theme';
import { useOfflineSettings } from '@/hooks/use-offline-settings';

const ThemeContext = createContext<{ theme: Theme | undefined }>({ theme: undefined });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { settings, loading } = useOfflineSettings();
  const { applyTheme, setupSystemThemeListener } = useTheme();

  // Apply theme on initial load and when settings change
  useEffect(() => {
    if (!loading && settings) {
      const theme = (settings.theme || 'light') as Theme;
      applyTheme(theme);
      const cleanup = setupSystemThemeListener(theme);
      return cleanup;
    }
  }, [settings, loading, applyTheme, setupSystemThemeListener]);

  return (
    <ThemeContext.Provider value={{ theme: settings?.theme as Theme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeContext() {
  return useContext(ThemeContext);
}

