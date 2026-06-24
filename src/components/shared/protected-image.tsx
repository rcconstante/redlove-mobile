import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { absoluteMediaUrl } from '@/lib/api';
import { radius, type ThemeColors } from '@/constants/theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { Text } from '@/components/ui/text';

export function ProtectedImage({
  uri,
  locked = false,
  height = 260,
}: {
  uri: string | null;
  locked?: boolean;
  height?: number;
}) {
  const styles = useThemedStyles(createStyles);
  const resolved = absoluteMediaUrl(uri);
  return (
    <View style={[styles.frame, { height }]}>
      {resolved ? <Image source={{ uri: resolved }} contentFit="cover" style={StyleSheet.absoluteFill} blurRadius={locked ? 24 : 0} /> : null}
      {!resolved ? (
        <View style={styles.placeholder}>
          <Text variant="muted">No photo</Text>
        </View>
      ) : null}
      {locked ? (
        <View style={styles.locked}>
          <Text style={styles.lockedText}>Premium media</Text>
        </View>
      ) : null}
    </View>
  );
}

function createStyles(themeColors: ThemeColors) {
  return StyleSheet.create({
  frame: {
    overflow: 'hidden',
    borderRadius: radius.lg,
    backgroundColor: themeColors.cardMuted,
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locked: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  lockedText: {
    fontWeight: '900',
    color: themeColors.white,
  },
  });
}
