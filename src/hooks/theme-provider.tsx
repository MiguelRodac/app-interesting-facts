import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';

type ThemePreference = 'system' | 'light' | 'dark';

interface ThemeContextValue {
  colorScheme: 'light' | 'dark';
  preference: ThemePreference;
  setPreference: (pref: ThemePreference) => void;
  toggleDarkMode: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useSystemColorScheme();
  const [preference, setPreference] = useState<ThemePreference>('system');

  const toggleDarkMode = useCallback(() => {
    const currentResolved = preference === 'system' ? (systemScheme ?? 'light') : preference;
    setPreference(currentResolved === 'dark' ? 'light' : 'dark');
  }, [preference, systemScheme]);

  const resolvedScheme: 'light' | 'dark' =
    preference === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : preference;

  return (
    <ThemeContext.Provider value={{ colorScheme: resolvedScheme, preference, setPreference, toggleDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeContext(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useThemeContext must be used within ThemeProvider');
  return ctx;
}
