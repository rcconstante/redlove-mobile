import { useContext } from 'react';

import { AppThemeContext } from '@/contexts/theme-context';
import { DEFAULT_THEME_MODE, colors, themeOptions } from '@/constants/theme';

export function useTheme() {
  const context = useContext(AppThemeContext);
  return (
    context ?? {
      mode: DEFAULT_THEME_MODE,
      colors,
      options: themeOptions,
      selectMode: () => undefined,
    }
  );
}
