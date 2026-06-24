import { StyleSheet, View } from 'react-native';

import { radius, type ThemeColors } from '@/constants/theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import type { ToastState } from '@/hooks/use-toast';
import { Text } from './text';

export function Toast({ toast }: { toast: ToastState }) {
  const styles = useThemedStyles(createStyles);
  if (!toast) return null;
  return (
    <View style={[styles.toast, toast.tone === 'error' ? styles.error : toast.tone === 'success' ? styles.success : null]}>
      <Text style={styles.text}>{toast.message}</Text>
    </View>
  );
}

function createStyles(themeColors: ThemeColors) {
  return StyleSheet.create({
  toast: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 24,
    zIndex: 50,
    backgroundColor: themeColors.cardMuted,
    borderRadius: radius.md,
    padding: 14,
    borderColor: themeColors.borderStrong,
    borderWidth: 1,
  },
  success: {
    borderColor: themeColors.success,
  },
  error: {
    borderColor: themeColors.danger,
  },
  text: {
    fontWeight: '700',
    textAlign: 'center',
  },
  });
}
