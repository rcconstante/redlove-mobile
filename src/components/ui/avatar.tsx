import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { absoluteMediaUrl } from '@/lib/api';
import type { ThemeColors } from '@/constants/theme';
import { useThemedStyles } from '@/hooks/use-themed-styles';
import { initials } from '@/utils/helpers';
import { Text } from './text';

type AvatarProps = {
  uri?: string | null;
  name?: string | null;
  size?: number;
};

export function Avatar({ uri, name, size = 48 }: AvatarProps) {
  const styles = useThemedStyles(createStyles);
  const resolved = absoluteMediaUrl(uri);
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      {resolved ? (
        <Image source={{ uri: resolved }} style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]} contentFit="cover" />
      ) : (
        <Text style={[styles.initials, { fontSize: Math.max(14, size * 0.34) }]}>{initials(name)}</Text>
      )}
    </View>
  );
}

function createStyles(themeColors: ThemeColors) {
  return StyleSheet.create({
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: themeColors.cardMuted,
    borderWidth: 1,
    borderColor: themeColors.borderStrong,
    overflow: 'hidden',
  },
  image: {
    backgroundColor: themeColors.cardMuted,
  },
  initials: {
    fontWeight: '900',
    color: themeColors.text,
  },
  });
}
