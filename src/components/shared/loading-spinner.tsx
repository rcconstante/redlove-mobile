import { ActivityIndicator, StyleSheet, View } from 'react-native';

import type { ThemeColors } from '@/constants/theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useTheme } from '@/hooks/use-theme';

export function LoadingSpinner() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.primary} size="large" />
    </View>
  );
}

function createStyles(themeColors: ThemeColors) {
  return StyleSheet.create({
  center: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  });
}
