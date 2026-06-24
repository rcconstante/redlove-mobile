import { ActivityIndicator, Pressable, StyleSheet, type PressableProps, type ViewStyle } from 'react-native';

import { radius, type ThemeColors } from '@/constants/theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useTheme } from '@/hooks/use-theme';
import { Text } from './text';

type ButtonProps = PressableProps & {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  loading?: boolean;
  fullWidth?: boolean;
};

export function Button({ title, variant = 'primary', loading = false, disabled, fullWidth, style, ...props }: ButtonProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const buttonStyle = [
    styles.base,
    styles[variant],
    fullWidth ? styles.fullWidth : null,
    disabled || loading ? styles.disabled : null,
    style as ViewStyle,
  ];

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      style={({ pressed }) => [buttonStyle, pressed && !disabled ? styles.pressed : null]}
      {...props}
    >
      {loading ? <ActivityIndicator color={variant === 'outline' || variant === 'ghost' ? colors.primary : colors.white} /> : null}
      <Text style={[styles.text, variant === 'outline' || variant === 'ghost' ? styles.textOutline : null]}>{title}</Text>
    </Pressable>
  );
}

function createStyles(themeColors: ThemeColors) {
  return StyleSheet.create({
  base: {
    minHeight: 52,
    paddingHorizontal: 20,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  fullWidth: {
    width: '100%',
  },
  primary: {
    backgroundColor: themeColors.primary,
  },
  secondary: {
    backgroundColor: themeColors.secondary,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: themeColors.borderStrong,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  danger: {
    backgroundColor: themeColors.danger,
  },
  disabled: {
    opacity: 0.55,
  },
  pressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  text: {
    color: themeColors.white,
    fontSize: 15,
    fontWeight: '800',
  },
  textOutline: {
    color: themeColors.text,
  },
  });
}
