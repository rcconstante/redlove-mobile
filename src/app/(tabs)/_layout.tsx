import { Redirect, Tabs } from 'expo-router';

import { LoadingSpinner } from '@/components/shared/loading-spinner';
import { Icon, type IconName } from '@/components/ui/icon';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/use-theme';

type TabIconProps = {
  name: IconName;
  focused: boolean;
  activeColor: string;
  inactiveColor: string;
};

function TabIcon({ name, focused, activeColor, inactiveColor }: TabIconProps) {
  return <Icon name={name} size={24} color={focused ? activeColor : inactiveColor} />;
}

export default function TabsLayout() {
  const { user, loading } = useAuth();
  const appTheme = useTheme();
  const themedColors = appTheme.colors;
  if (loading) return <LoadingSpinner />;
  if (!user) return <Redirect href="/(auth)/login" />;
  if (!user.profilePhotoUrl) return <Redirect href="/(onboarding)/photo" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: themedColors.primary,
        tabBarInactiveTintColor: themedColors.textMuted,
        tabBarStyle: {
          backgroundColor: themedColors.backgroundElevated,
          borderTopColor: themedColors.border,
          minHeight: 72,
          paddingBottom: 10,
          paddingTop: 8,
        },
        tabBarItemStyle: { paddingVertical: 4 },
        tabBarLabelStyle: { fontSize: 10.5, fontWeight: '800' },
      }}
    >
      <Tabs.Screen
        name="discover"
        options={{
          title: 'Discover',
          tabBarAccessibilityLabel: 'Discover profiles',
          tabBarIcon: ({ focused }) => <TabIcon name="compass" focused={focused} activeColor={themedColors.primary} inactiveColor={themedColors.textMuted} />,
        }}
      />
      <Tabs.Screen
        name="match-maker"
        options={{
          title: 'Match Maker',
          tabBarAccessibilityLabel: 'Swipe match maker',
          tabBarIcon: ({ focused }) => <TabIcon name="spark" focused={focused} activeColor={themedColors.primary} inactiveColor={themedColors.textMuted} />,
        }}
      />
      <Tabs.Screen
        name="likes"
        options={{
          title: 'Likes',
          tabBarAccessibilityLabel: 'Likes list',
          tabBarIcon: ({ focused }) => <TabIcon name="heart" focused={focused} activeColor={themedColors.primary} inactiveColor={themedColors.textMuted} />,
        }}
      />
      <Tabs.Screen
        name="matches"
        options={{
          title: 'Matches',
          tabBarAccessibilityLabel: 'Matches and chats',
          tabBarIcon: ({ focused }) => <TabIcon name="matches" focused={focused} activeColor={themedColors.primary} inactiveColor={themedColors.textMuted} />,
        }}
      />
      <Tabs.Screen
        name="preferences"
        options={{
          title: 'Preferences',
          tabBarAccessibilityLabel: 'Discovery preferences',
          tabBarIcon: ({ focused }) => <TabIcon name="sliders" focused={focused} activeColor={themedColors.primary} inactiveColor={themedColors.textMuted} />,
        }}
      />
    </Tabs>
  );
}
