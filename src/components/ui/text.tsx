import { Text as NativeText, StyleSheet, type TextProps } from 'react-native';

import type { ThemeColors } from '@/constants/theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';

type Props = TextProps & {
  variant?: 'title' | 'heading' | 'body' | 'small' | 'muted' | 'label';
};

export function Text({ variant = 'body', style, ...props }: Props) {
  const styles = useThemedStyles(createStyles);
  return <NativeText style={[styles.base, styles[variant], style]} {...props} />;
}

function createStyles(themeColors: ThemeColors) {
  return StyleSheet.create({
  base: {
    color: themeColors.text,
  },
  title: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '900',
  },
  heading: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
  },
  body: {
    fontSize: 16,
    lineHeight: 22,
  },
  small: {
    fontSize: 13,
    lineHeight: 18,
  },
  muted: {
    fontSize: 14,
    lineHeight: 20,
    color: themeColors.textMuted,
  },
  label: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    color: themeColors.textMuted,
    textTransform: 'uppercase',
  },
  });
}
