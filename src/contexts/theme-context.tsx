import * as SystemUI from 'expo-system-ui';
import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import { DEFAULT_THEME_MODE, applyThemeMode, themeOptions, themePalettes, type ThemeColors, type ThemeMode } from '@/constants/theme';

export type AppTheme = {
  mode: ThemeMode;
  colors: ThemeColors;
  options: typeof themeOptions;
  selectMode: (mode: ThemeMode) => void;
};

export const AppThemeContext = createContext<AppTheme | null>(null);

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(DEFAULT_THEME_MODE);
  const palette = useMemo<ThemeColors>(() => ({ ...themePalettes[mode] }), [mode]);

  useEffect(() => {
    applyThemeMode(mode);
    void SystemUI.setBackgroundColorAsync(palette.background);
  }, [mode, palette.background]);

  const selectMode = useCallback((nextMode: ThemeMode) => {
    if (nextMode === mode) return;
    applyThemeMode(nextMode);
    setMode(nextMode);
  }, [mode]);

  const value = useMemo(
    () => ({
      mode,
      colors: palette,
      options: themeOptions,
      selectMode,
    }),
    [mode, palette, selectMode],
  );

  return <AppThemeContext.Provider value={value}>{children}</AppThemeContext.Provider>;
}
