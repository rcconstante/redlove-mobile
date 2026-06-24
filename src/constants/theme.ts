export type ThemeMode = 'light' | 'dark' | 'rose';

export type ThemeColors = {
  background: string;
  backgroundElevated: string;
  card: string;
  cardMuted: string;
  border: string;
  borderStrong: string;
  text: string;
  textMuted: string;
  textSubtle: string;
  primary: string;
  primaryDark: string;
  secondary: string;
  accent: string;
  success: string;
  warning: string;
  danger: string;
  white: string;
  black: string;
};

export const themePalettes: Record<ThemeMode, ThemeColors> = {
  light: {
    background: '#ffffff',
    backgroundElevated: '#ffffff',
    card: '#f7f2f5',
    cardMuted: '#efe7ee',
    border: 'rgba(36,16,56,0.12)',
    borderStrong: 'rgba(36,16,56,0.2)',
    text: '#1c1026',
    textMuted: 'rgba(28,16,38,0.68)',
    textSubtle: 'rgba(28,16,38,0.46)',
    primary: '#e91e63',
    primaryDark: '#b6154b',
    secondary: '#7b2ff7',
    accent: '#007ca8',
    success: '#0f9f68',
    warning: '#b97700',
    danger: '#d92f4d',
    white: '#ffffff',
    black: '#000000',
  },
  dark: {
    background: '#13051f',
    backgroundElevated: '#1d0a2f',
    card: '#241038',
    cardMuted: '#301449',
    border: 'rgba(255,255,255,0.12)',
    borderStrong: 'rgba(255,255,255,0.22)',
    text: '#fff6fb',
    textMuted: 'rgba(255,246,251,0.68)',
    textSubtle: 'rgba(255,246,251,0.48)',
    primary: '#e91e63',
    primaryDark: '#b6154b',
    secondary: '#7b2ff7',
    accent: '#38d5ff',
    success: '#23c483',
    warning: '#ffb020',
    danger: '#ff4d67',
    white: '#ffffff',
    black: '#000000',
  },
  rose: {
    background: '#fff4f8',
    backgroundElevated: '#ffffff',
    card: '#ffe8f0',
    cardMuted: '#ffd9e7',
    border: 'rgba(181,21,75,0.14)',
    borderStrong: 'rgba(181,21,75,0.26)',
    text: '#2c1020',
    textMuted: 'rgba(44,16,32,0.68)',
    textSubtle: 'rgba(44,16,32,0.46)',
    primary: '#e91e63',
    primaryDark: '#b6154b',
    secondary: '#8e44ff',
    accent: '#006f95',
    success: '#10966a',
    warning: '#a96b00',
    danger: '#d92f4d',
    white: '#ffffff',
    black: '#000000',
  },
};

export const themeOptions: { mode: ThemeMode; label: string; description: string }[] = [
  { mode: 'light', label: 'White', description: 'Clean bright mode for daily use.' },
  { mode: 'dark', label: 'Dark', description: 'The original RedLove dark look.' },
  { mode: 'rose', label: 'Rose', description: 'A softer RedLove blush theme.' },
];

export const DEFAULT_THEME_MODE: ThemeMode = 'dark';

export const colors: ThemeColors = { ...themePalettes[DEFAULT_THEME_MODE] };

type ThemeStyleListener = (themeColors: ThemeColors) => void;
const themeStyleListeners = new Set<ThemeStyleListener>();

export function applyThemeMode(mode: ThemeMode) {
  Object.assign(colors, themePalettes[mode]);
  themeStyleListeners.forEach((listener) => listener(colors));
}

export function registerThemeStyleSheet(listener: ThemeStyleListener) {
  themeStyleListeners.add(listener);
  listener(colors);
  return () => {
    themeStyleListeners.delete(listener);
  };
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
};

export const typography = {
  title: 28,
  heading: 22,
  subheading: 18,
  body: 16,
  small: 13,
  tiny: 11,
};

export const shadow = {
  shadowColor: colors.black,
  shadowOffset: { width: 0, height: 12 },
  shadowOpacity: 0.18,
  shadowRadius: 24,
  elevation: 8,
};
