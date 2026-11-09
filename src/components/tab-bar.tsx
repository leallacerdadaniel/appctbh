import { router, type Href, type Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { CharlotteFace } from '@/components/charlotte';
import { Icon, type IconName } from '@/components/icon';
import { AppText, PressableScale, tapFeedback } from '@/components/ui';
import { Fonts, MaxContentWidth } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { TourTarget, type TourTargetId } from '@/lib/tour';
import { trackAction } from '@/lib/usage';

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

/** What the app tour points at in the bar. */
const TOUR_TARGET: Record<string, TourTargetId | undefined> = {
  explorer: 'tab-explorer',
  maison: 'tab-maison',
  sejour: 'tab-sejour',
};

const ICONS: Record<string, IconName> = {
  index: 'home',
  explorer: 'explore',
  maison: 'sofa',
  sejour: 'stay',
};

/** The assistant button sits between the second and the third tab. */
const CENTER_AFTER = 1;
const CENTER_SIZE = 60;

/**
 * v3 bottom bar (owner, 2026-11-08): white, full width, Accueil · Explorer · [Charlotte] · Maison · Séjour.
 * Charlotte (the assistant) is not a tab: her raised face in the middle opens the chat over the tabs, like a
 * super-app's main action. Own layout so labels are never clipped.
 */
export function TabBar({ state, descriptors, emitter, navigateToTab, insets }: TabBarProps) {
  const theme = useTheme();
  const { t } = useI18n();

  const tabs = state.routes.map((route, index) => {
    const focused = index === state.index;
    const label = descriptors[route.key].options.title ?? route.name;
    const color = focused ? theme.brand : theme.textSecondary;
    const tourId = TOUR_TARGET[route.name];
    const tab = (
      <Pressable
        key={route.key}
        role="tab"
        aria-selected={focused}
        accessibilityLabel={label}
        onPress={() => {
          tapFeedback();
          const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigateToTab(route.key);
        }}
        style={styles.item}>
        <Icon name={ICONS[route.name] ?? 'home'} size={23} color={color} active={focused} />
        <AppText
          numberOfLines={1}
          color={color}
          style={[styles.label, { fontFamily: focused ? Fonts.bodySemi : Fonts.body }]}>
          {label}
        </AppText>
      </Pressable>
    );
    return tourId ? (
      <TourTarget key={route.key} id={tourId} style={styles.item}>
        {tab}
      </TourTarget>
    ) : (
      tab
    );
  });

  const center = (
    <View key="assistant" style={styles.item}>
      <TourTarget id="charlotte">
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={t.tabs.assistant}
        onPress={() => {
          trackAction('open_assistant', 'tab_bar');
          router.push('/assistant' as Href);
        }}
        style={[
          styles.center,
          { backgroundColor: theme.surface, borderColor: theme.surface, boxShadow: '0 8px 18px rgba(232, 12, 32, 0.32)' },
        ]}>
        <CharlotteFace size={50} />
      </PressableScale>
      </TourTarget>
      <AppText numberOfLines={1} style={[styles.label, styles.centerLabel]}>
        {t.tabs.assistant}
      </AppText>
    </View>
  );

  return (
    <View
      style={[
        styles.bar,
        { backgroundColor: theme.surface, borderTopColor: theme.line, paddingBottom: Math.max(insets.bottom, 10) },
      ]}>
      <View role="tablist" style={styles.row}>
        {[...tabs.slice(0, CENTER_AFTER + 1), center, ...tabs.slice(CENTER_AFTER + 1)]}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 8 },
  row: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', flexDirection: 'row', alignItems: 'flex-end' },
  item: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 3, minHeight: 44 },
  label: { fontSize: 11, lineHeight: 14 },
  center: {
    width: CENTER_SIZE,
    height: CENTER_SIZE,
    borderRadius: CENTER_SIZE / 2,
    borderWidth: 4,
    marginTop: -30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerLabel: { fontFamily: Fonts.bodySemi },
});
