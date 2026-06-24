import { StyleSheet, View, type ViewProps } from 'react-native';

import { radius, type ThemeColors } from '@/constants/theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';

export function Card({ style, ...props }: ViewProps) {
  const styles = useThemedStyles(createStyles);
  return <View style={[styles.card, style]} {...props} />;
}

function createStyles(themeColors: ThemeColors) {
  return StyleSheet.create({
  card: {
    backgroundColor: themeColors.card,
    borderColor: themeColors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: 18,
  },
  });
}
