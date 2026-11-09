import { router, Tabs, type Href } from 'expo-router';
import { useEffect, type ReactNode } from 'react';
import { View } from 'react-native';

import { TabBar } from '@/components/tab-bar';
import { TourOverlay } from '@/components/tour-overlay';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { useHome } from '@/lib/home';
import { useRulesIntro } from '@/lib/rules-intro';
import { TourProvider, useTourAutoStart } from '@/lib/tour';

export default function TabLayout() {
  const theme = useTheme();
  const { t } = useI18n();
  const { student } = useHome();
  // The house rules intro opens over the tabs until the student signs the current version.
  const rulesNeeded = useRulesIntro(student.email);
  useEffect(() => {
    if (rulesNeeded) router.push('/rules-intro' as Href);
  }, [rulesNeeded]);

  return (
    <TourProvider email={student.email}>
      <View style={{ flex: 1 }}>
        <TourStarter email={student.email} ready={rulesNeeded === false} />
        <Tabs
          tabBar={(props) => <TabBar {...props} />}
          screenOptions={{
            headerShown: false,
            animation: 'shift',
            sceneStyle: { backgroundColor: theme.background },
          }}>
          {/* v3 (owner, 2026-11-08): what the student uses most. The assistant button sits in the middle of
              the bar (not a tab); the Agenda became a page opened from Accueil and Maison. */}
          <Tabs.Screen name="index" options={{ title: t.tabs.home }} />
          <Tabs.Screen name="explorer" options={{ title: t.tabs.explorer }} />
          <Tabs.Screen name="maison" options={{ title: t.tabs.maison }} />
          <Tabs.Screen name="sejour" options={{ title: t.tabs.sejour }} />
        </Tabs>
        {/* The app tour (once, after the house rules), above the tab bar too. */}
        <TourOverlay />
      </View>
    </TourProvider>
  );
}

/** Inside the provider: starts the tour once the student has signed the house rules. */
function TourStarter({ email, ready }: { email: string; ready: boolean }): ReactNode {
  useTourAutoStart(email, ready);
  return null;
}
