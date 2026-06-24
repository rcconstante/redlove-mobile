import { StyleSheet, View } from 'react-native';

import { radius, type ThemeColors } from '@/constants/theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { Text } from '@/components/ui/text';

export function CompatibilityScore({ score }: { score?: number | null }) {
  const styles = useThemedStyles(createStyles);
  if (score == null) return null;
  return (
    <View style={styles.score}>
      <Text style={styles.text}>{Math.round(score)}% match</Text>
    </View>
  );
}

function createStyles(themeColors: ThemeColors) {
  return StyleSheet.create({
  score: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    backgroundColor: 'rgba(56,213,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(56,213,255,0.36)',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  text: {
    color: themeColors.accent,
    fontSize: 12,
    fontWeight: '900',
  },
  });
}
