import { Badge } from '@/components/ui/badge';

export function MatchBadge({ count }: { count?: number }) {
  if (!count) return null;
  return <Badge label={count > 9 ? '9+' : String(count)} tone="danger" />;
}
