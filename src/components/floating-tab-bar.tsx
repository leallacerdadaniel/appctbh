import type { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon, type IconName } from '@/components/icon';
import { AppText, tapFeedback } from '@/components/ui';
import { Fonts, MaxContentWidth, Radius, Shadow, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

const ICONS: Record<string, IconName> = {
  index: 'home',
  calendar: 'calendar',
  apartment: 'apartment',
  travel: 'travel',
  guide: 'guide',
};

/**
 * Floating white pill over the canvas (DUO reference). Own layout instead of the default bar,
 * whose fixed label box clipped the text inside the pill.
 */
export function FloatingTabBar({ state, descriptors, emitter, navigateToTab, insets }: TabBarProps) {
  const theme = useTheme();

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: Math.max(insets.bottom, Spacing.sm) + 4 }]}>
      <View role="tablist" style={[styles.pill, Shadow.floating, { backgroundColor: theme.surface }]}>
        {state.routes.map((route, index) => {
          const focused = index === state.index;
          const { options } = descriptors[route.key];
          const label = options.title ?? route.name;
          const color = focused ? theme.brand : theme.textSecondary;

          return (
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
              style={[styles.item, focused && { backgroundColor: theme.fill }]}>
              <Icon name={ICONS[route.name] ?? 'home'} size={22} color={color} active={focused} />
              <AppText
                numberOfLines={1}
                color={color}
                style={[styles.label, { fontFamily: focused ? Fonts.bodyMedium : Fonts.body }]}>
                {label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', paddingHorizontal: Spacing.md },
  pill: {
    width: '100%',
    maxWidth: MaxContentWidth,
    flexDirection: 'row',
    padding: 6,
    borderRadius: Radius.pill,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: 7,
    borderRadius: Radius.pill,
  },
  label: { fontSize: 11, lineHeight: 15 },
});
