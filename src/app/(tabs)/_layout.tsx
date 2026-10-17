import { Tabs } from 'expo-router';

import { FloatingTabBar } from '@/components/floating-tab-bar';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';

export default function TabLayout() {
  const theme = useTheme();
  const { t } = useI18n();

  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        animation: 'shift',
        sceneStyle: { backgroundColor: theme.background },
      }}>
      <Tabs.Screen name="index" options={{ title: t.tabs.home }} />
      <Tabs.Screen name="calendar" options={{ title: t.tabs.calendar }} />
      <Tabs.Screen name="apartment" options={{ title: t.tabs.apartment }} />
      <Tabs.Screen name="travel" options={{ title: t.tabs.travel }} />
      <Tabs.Screen name="guide" options={{ title: t.tabs.guide }} />
    </Tabs>
  );
}
