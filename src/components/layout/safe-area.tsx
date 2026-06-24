import { StyleSheet } from 'react-native';
import { SafeAreaView, type SafeAreaViewProps } from 'react-native-safe-area-context';

import type { ThemeColors } from '@/constants/theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';

export function SafeArea({ style, edges = ['top', 'left', 'right'], ...props }: SafeAreaViewProps) {
  const styles = useThemedStyles(createStyles);
  return <SafeAreaView edges={edges} style={[styles.safe, style]} {...props} />;
}

function createStyles(themeColors: ThemeColors) {
  return StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: themeColors.background,
  },
  });
}
