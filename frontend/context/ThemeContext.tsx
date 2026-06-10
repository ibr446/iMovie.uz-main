
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Theme } from '../../types';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    const savedTheme = localStorage.getItem('imovie-theme');
    return savedTheme === 'light' || savedTheme === 'dark' ? savedTheme : 'dark';
  });

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  useEffect(() => {
    const root = window.document.documentElement;
    const body = window.document.body;
    localStorage.setItem('imovie-theme', theme);

    if (theme === 'dark') {
      root.classList.add('dark');
      root.dataset.theme = 'dark';
      root.style.backgroundColor = '#09090b';
      root.style.color = '#f4f4f5';
      body.classList.remove('bg-white', 'text-zinc-950');
      body.classList.add('bg-zinc-950', 'text-zinc-100');
    } else {
      root.classList.remove('dark');
      root.dataset.theme = 'light';
      root.style.backgroundColor = '#ffffff';
      root.style.color = '#09090b';
      body.classList.remove('bg-zinc-950', 'text-zinc-100');
      body.classList.add('bg-white', 'text-zinc-950');
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};
