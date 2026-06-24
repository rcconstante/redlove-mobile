import { Redirect } from 'expo-router';

import { LoadingSpinner } from '@/components/shared/loading-spinner';
import { useAuth } from '@/hooks/use-auth';

export default function IndexRoute() {
  const { user, loading } = useAuth();

  if (loading) return <LoadingSpinner />;
  if (!user) return <Redirect href="/landing" />;
  if (!user.profilePhotoUrl) return <Redirect href="/(onboarding)/photo" />;
  return <Redirect href="/(tabs)/discover" />;
}
