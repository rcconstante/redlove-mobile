import { router, usePathname } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';

import type { ThemeColors } from '@/constants/theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { useTheme } from '@/hooks/use-theme';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { SafeArea } from './safe-area';

type ScreenWrapperProps = {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  scroll?: boolean;
  contentStyle?: ViewStyle;
};

const ROOT_PATHS = new Set([
  '/',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/photo',
  '/interests',
  '/welcome',
  '/discover',
  '/match-maker',
  '/likes',
  '/matches',
  '/preferences',
]);

export function ScreenWrapper({ title, subtitle, children, scroll = true, contentStyle }: ScreenWrapperProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const pathname = usePathname();
  const showBack = Boolean(title) && !ROOT_PATHS.has(pathname);

  function goBack() {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/(tabs)/discover');
  }

  const body = (
    <View style={[styles.content, contentStyle]}>
      {title ? (
        <View style={styles.header}>
          <View style={styles.titleRow}>
            {showBack ? (
              <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={goBack} style={({ pressed }) => [styles.backButton, pressed ? styles.backButtonPressed : null]}>
                <Icon name="chevron-left" size={22} color={colors.text} />
              </Pressable>
            ) : null}
            <Text variant="title" style={styles.titleText}>
              {title}
            </Text>
          </View>
          {subtitle ? <Text variant="muted">{subtitle}</Text> : null}
        </View>
      ) : null}
      {children}
    </View>
  );

  return (
    <SafeArea>
      {scroll ? (
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
          {body}
        </ScrollView>
      ) : (
        body
      )}
    </SafeArea>
  );
}

function createStyles(themeColors: ThemeColors) {
  return StyleSheet.create({
  scroll: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    backgroundColor: themeColors.background,
    paddingHorizontal: 20,
    paddingTop: 26,
    paddingBottom: 28,
    gap: 18,
  },
  header: {
    gap: 8,
    paddingTop: 10,
    paddingBottom: 6,
  },
  titleRow: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: themeColors.card,
    borderWidth: 1,
    borderColor: themeColors.border,
  },
  backButtonPressed: {
    opacity: 0.72,
  },
  titleText: {
    flex: 1,
  },
  });
}
