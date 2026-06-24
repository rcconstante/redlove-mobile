import { Pressable, StyleSheet, View } from 'react-native';
import { router, type Href } from 'expo-router';

import { radius, type ThemeColors } from '@/constants/theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { Text } from '@/components/ui/text';

export function NotificationBell({ count }: { count: number }) {
  const styles = useThemedStyles(createStyles);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Notifications"
      onPress={() => router.push('/notifications' as Href)}
      style={styles.button}
    >
      <Text style={styles.icon}>!</Text>
      {count > 0 ? (
        <View style={styles.count}>
          <Text style={styles.countText}>{count > 9 ? '9+' : count}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function createStyles(themeColors: ThemeColors) {
  return StyleSheet.create({
  button: {
    width: 42,
    height: 42,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: themeColors.card,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  icon: {
    fontWeight: '900',
  },
  count: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: themeColors.primary,
    paddingHorizontal: 4,
  },
  countText: {
    fontSize: 10,
    fontWeight: '900',
  },
  });
}
