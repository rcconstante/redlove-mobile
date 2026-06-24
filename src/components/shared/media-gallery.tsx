import { StyleSheet, View } from 'react-native';

import { ProtectedImage } from '@/components/shared/protected-image';
import type { MediaItem } from '@/types/api.types';

export function MediaGallery({ items }: { items: MediaItem[] }) {
  return (
    <View style={styles.grid}>
      {items.map((item) => (
        <View key={item.id} style={styles.item}>
          <ProtectedImage uri={item.url} locked={item.isNude} height={170} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  item: {
    width: '48%',
  },
});
