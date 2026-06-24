import { Redirect, Stack } from 'expo-router';

import { LoadingSpinner } from '@/components/shared/loading-spinner';
import { useAuth } from '@/hooks/use-auth';

export default function AuthLayout() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingSpinner />;
  if (user) return <Redirect href={user.profilePhotoUrl ? '/(tabs)/discover' : '/(onboarding)/photo'} />;

  return <Stack screenOptions={{ headerShown: false, animation: 'fade', animationDuration: 160 }} />;
}
