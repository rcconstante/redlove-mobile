import { StyleSheet, View } from 'react-native';

import { radius, type ThemeColors } from '@/constants/theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { Text } from './text';

export function Badge({ label, tone = 'default' }: { label: string; tone?: 'default' | 'accent' | 'success' | 'danger' }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={[styles.badge, styles[tone]]}>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

function createStyles(themeColors: ThemeColors) {
  return StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: themeColors.cardMuted,
  },
  default: {
    backgroundColor: themeColors.cardMuted,
  },
  accent: {
    backgroundColor: 'rgba(56,213,255,0.18)',
  },
  success: {
    backgroundColor: 'rgba(35,196,131,0.18)',
  },
  danger: {
    backgroundColor: 'rgba(255,77,103,0.18)',
  },
  text: {
    color: themeColors.text,
    fontSize: 12,
    fontWeight: '800',
  },
  });
}
