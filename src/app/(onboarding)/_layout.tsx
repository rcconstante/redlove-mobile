import { Redirect, Stack } from 'expo-router';

import { LoadingSpinner } from '@/components/shared/loading-spinner';
import { useAuth } from '@/hooks/use-auth';

export default function OnboardingLayout() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingSpinner />;
  if (!user) return <Redirect href="/(auth)/login" />;

  return <Stack screenOptions={{ headerShown: false, animation: 'fade', animationDuration: 160 }} />;
}
