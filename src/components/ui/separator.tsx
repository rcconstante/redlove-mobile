import { StyleSheet, View } from 'react-native';

import type { ThemeColors } from '@/constants/theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';

export function Separator() {
  const styles = useThemedStyles(createStyles);
  return <View style={styles.separator} />;
}

function createStyles(themeColors: ThemeColors) {
  return StyleSheet.create({
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: themeColors.border,
  },
  });
}
