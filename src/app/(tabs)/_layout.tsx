import { Tabs } from 'expo-router';
import {
  BookOpen,
  Building2,
  CalendarDays,
  House,
  UserRound,
  type LucideIcon,
} from 'lucide-react-native';
import type { ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { tapFeedback } from '@/components/ui';
import { Fonts } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';

function icon(Icon: LucideIcon) {
  return function TabIcon({ color, focused }: { color: ColorValue; focused: boolean }) {
    return <Icon size={22} color={color as string} strokeWidth={focused ? 2.4 : 1.8} />;
  };
}

export default function TabLayout() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();

  return (
    <Tabs
      screenListeners={{ tabPress: () => tapFeedback() }}
      screenOptions={{
        headerShown: false,
        animation: 'shift',
        tabBarActiveTintColor: theme.brand,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarLabelStyle: { fontFamily: Fonts.bodyMedium, fontSize: 11 },
        tabBarStyle: {
          backgroundColor: theme.surface,
          borderTopColor: theme.line,
          height: 60 + insets.bottom,
          paddingTop: 6,
        },
        sceneStyle: { backgroundColor: theme.background },
      }}>
      <Tabs.Screen name="index" options={{ title: t.tabs.home, tabBarIcon: icon(House) }} />
      <Tabs.Screen name="calendar" options={{ title: t.tabs.calendar, tabBarIcon: icon(CalendarDays) }} />
      <Tabs.Screen name="apartment" options={{ title: t.tabs.apartment, tabBarIcon: icon(Building2) }} />
      <Tabs.Screen name="guide" options={{ title: t.tabs.guide, tabBarIcon: icon(BookOpen) }} />
      <Tabs.Screen name="profile" options={{ title: t.tabs.profile, tabBarIcon: icon(UserRound) }} />
    </Tabs>
  );
}
