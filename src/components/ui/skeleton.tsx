import { StyleSheet, View } from 'react-native';

import { radius, type ThemeColors } from '@/constants/theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';

export function Skeleton({ height = 18, width = '100%' }: { height?: number; width?: number | `${number}%` }) {
  const styles = useThemedStyles(createStyles);
  return <View style={[styles.skeleton, { height, width }]} />;
}

function createStyles(themeColors: ThemeColors) {
  return StyleSheet.create({
  skeleton: {
    borderRadius: radius.sm,
    backgroundColor: themeColors.cardMuted,
    opacity: 0.65,
  },
  });
}
