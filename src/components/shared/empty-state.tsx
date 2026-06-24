import { StyleSheet, View } from 'react-native';

import type { ThemeColors } from '@/constants/theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';

export function EmptyState({ title, message, actionLabel, onAction }: { title: string; message?: string; actionLabel?: string; onAction?: () => void }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.empty}>
      <Text variant="heading" style={styles.centerText}>
        {title}
      </Text>
      {message ? (
        <Text variant="muted" style={styles.centerText}>
          {message}
        </Text>
      ) : null}
      {actionLabel && onAction ? <Button title={actionLabel} variant="outline" onPress={onAction} /> : null}
    </View>
  );
}

function createStyles(themeColors: ThemeColors) {
  return StyleSheet.create({
  empty: {
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 20,
    borderRadius: 16,
    backgroundColor: themeColors.card,
    borderColor: themeColors.border,
    borderWidth: 1,
  },
  centerText: {
    textAlign: 'center',
  },
  });
}
