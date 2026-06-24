import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { radius, type ThemeColors } from '@/constants/theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useTheme } from '@/hooks/use-theme';
import { Text } from './text';

type InputProps = TextInputProps & {
  label: string;
  error?: string | null;
};

export function Input({ label, error, style, ...props }: InputProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.wrapper}>
      <Text variant="label">{label}</Text>
      <TextInput
        placeholderTextColor={colors.textSubtle}
        style={[styles.input, error ? styles.inputError : null, style]}
        autoCapitalize="none"
        {...props}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

function createStyles(themeColors: ThemeColors) {
  return StyleSheet.create({
  wrapper: {
    gap: 8,
  },
  input: {
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: themeColors.border,
    backgroundColor: themeColors.card,
    color: themeColors.text,
    paddingHorizontal: 15,
    fontSize: 16,
  },
  inputError: {
    borderColor: themeColors.danger,
  },
  error: {
    color: themeColors.danger,
    fontSize: 12,
  },
  });
}
