'use client';

import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(false);
  const season = 'summer'; // Always summer

  useEffect(() => {
    // Check dark mode preference
    if (typeof window !== 'undefined') {
      const isDarkMode = document.documentElement.classList.contains('dark');
      setIsDark(isDarkMode);
    }
  }, []);

  const themeConfig = {
    bgGradient: 'from-yellow-200 via-orange-200 to-red-200 dark:from-yellow-900/30 dark:via-orange-900/30 dark:to-red-900/30',
    accentColor: 'text-yellow-600 dark:text-yellow-400',
    lightBg: 'bg-yellow-50 dark:bg-yellow-900/10',
    emoji: '☀️',
  };

  return (
    <ThemeContext.Provider value={{ season, isDark, themeConfig }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
