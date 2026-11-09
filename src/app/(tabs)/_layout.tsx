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
      {/* "Structure by task" (owner, 2026-11-08): now · home life · Chez Toi · dates · the city. */}
      <Tabs.Screen name="index" options={{ title: t.tabs.home }} />
      <Tabs.Screen name="maison" options={{ title: t.tabs.maison }} />
      <Tabs.Screen name="chez-toi" options={{ title: t.tabs.chezToi }} />
      <Tabs.Screen name="calendar" options={{ title: t.tabs.calendar }} />
      <Tabs.Screen name="bh" options={{ title: t.tabs.bh }} />
    </Tabs>
  );
}
