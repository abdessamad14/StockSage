import { useEffect } from 'react';

export type Theme = 'light' | 'dark' | 'system';

export function useTheme() {
  const applyTheme = (theme: Theme) => {
    const root = document.documentElement;
    
    // Remove existing theme classes
    root.classList.remove('light', 'dark');
    
    if (theme === 'system') {
      // Check system preference
      const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.add(isDarkMode ? 'dark' : 'light');
    } else {
      // Apply selected theme
      root.classList.add(theme);
    }
  };

  const setupSystemThemeListener = (theme: Theme) => {
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      const root = document.documentElement;
      root.classList.remove('light', 'dark');
      root.classList.add(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleChange);
    
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  };

  return {
    applyTheme,
    setupSystemThemeListener
  };
}

