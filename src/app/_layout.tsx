import { DarkTheme, DefaultTheme, ThemeProvider, type Theme } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { GlobalIncomingCallBanner } from '@/components/shared/global-incoming-call-banner';
import { AuthProvider } from '@/contexts/auth-context';
import { NotificationProvider } from '@/contexts/notification-context';
import { AppThemeProvider } from '@/contexts/theme-context';
import { useTheme } from '@/hooks/use-theme';

function ThemedRoot() {
  const appTheme = useTheme();
  const navigationTheme = useMemo<Theme>(() => {
    const baseTheme = appTheme.mode === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...baseTheme,
      dark: appTheme.mode === 'dark',
      colors: {
        ...baseTheme.colors,
        primary: appTheme.colors.primary,
        background: appTheme.colors.background,
        card: appTheme.colors.backgroundElevated,
        text: appTheme.colors.text,
        border: appTheme.colors.border,
        notification: appTheme.colors.primary,
      },
    };
  }, [appTheme.colors, appTheme.mode]);

  return (
    <ThemeProvider value={navigationTheme}>
      <SafeAreaProvider>
        <AuthProvider>
          <NotificationProvider>
            <Stack
              screenOptions={{
                headerShown: false,
                animation: 'fade',
                animationDuration: 160,
                contentStyle: { backgroundColor: appTheme.colors.background },
              }}
            />
            <GlobalIncomingCallBanner />
            <StatusBar style={appTheme.mode === 'dark' ? 'light' : 'dark'} />
            <AnimatedSplashOverlay />
          </NotificationProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AppThemeProvider>
      <ThemedRoot />
    </AppThemeProvider>
  );
}
