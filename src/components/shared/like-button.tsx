import { Button } from '@/components/ui/button';

export function LikeButton({ onPress, loading }: { onPress: () => void; loading?: boolean }) {
  return <Button title="Like" loading={loading} onPress={onPress} />;
}
