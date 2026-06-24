import { useMemo } from 'react';

import type { ThemeColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const styleCache = new WeakMap<object, WeakMap<ThemeColors, unknown>>();

export function useThemedStyles<TStyles>(factory: (themeColors: ThemeColors) => TStyles): TStyles {
  const { colors } = useTheme();
  return useMemo(() => {
    let factoryCache = styleCache.get(factory);
    if (!factoryCache) {
      factoryCache = new WeakMap<ThemeColors, unknown>();
      styleCache.set(factory, factoryCache);
    }

    const cached = factoryCache.get(colors);
    if (cached) return cached as TStyles;

    const nextStyles = factory(colors);
    factoryCache.set(colors, nextStyles);
    return nextStyles;
  }, [colors, factory]);
}
