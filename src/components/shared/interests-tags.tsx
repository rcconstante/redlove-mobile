import { StyleSheet, View } from 'react-native';

import { Badge } from '@/components/ui/badge';

export function InterestsTags({ interests }: { interests: string[] }) {
  if (interests.length === 0) return null;
  return (
    <View style={styles.tags}>
      {interests.map((interest) => (
        <Badge key={interest} label={interest} tone="accent" />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});
