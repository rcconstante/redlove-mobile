import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import type { ThemeColors } from '@/constants/theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { Text } from '@/components/ui/text';

export function Header({ title, back = false, action }: { title: string; back?: boolean; action?: React.ReactNode }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.header}>
      {back ? (
        <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.button}>
          <Text style={styles.buttonText}>{'<'}</Text>
        </Pressable>
      ) : (
        <View style={styles.button} />
      )}
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.action}>{action}</View>
    </View>
  );
}

function createStyles(themeColors: ThemeColors) {
  return StyleSheet.create({
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: themeColors.background,
    borderBottomColor: themeColors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  button: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 26,
    fontWeight: '800',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '900',
  },
  action: {
    width: 42,
    alignItems: 'flex-end',
  },
  });
}
