import { useState, type ReactNode } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandBar } from '@/components/brand-bar';
import { Icon } from '@/components/icon';
import { AppText, PressableScale } from '@/components/ui';
import { Fonts, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Every screen: red BrandBar (fixed) + scrollable gray canvas with a centered 560px column.
 * `back` for screens pushed over the tabs; `header` for extra content right under the bar;
 * `onRefresh` adds pull-to-refresh (the spinner shows until the promise settles).
 */
export function Screen({
  title,
  subtitle,
  children,
  header,
  back = false,
  onRefresh,
}: {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  header?: ReactNode;
  back?: boolean;
  onRefresh?: () => Promise<unknown>;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  async function refresh() {
    if (!onRefresh) return;
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <BrandBar back={back} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              tintColor={theme.textSecondary}
              colors={[theme.textSecondary]}
            />
          ) : undefined
        }>
        {header}
        <View style={[styles.column, { paddingTop: Spacing.lg }]}>
          {title && (
            <View style={{ gap: Spacing.xs, marginBottom: Spacing.sm }}>
              <AppText variant="display">{title}</AppText>
              {subtitle && <AppText color={theme.textSecondary}>{subtitle}</AppText>}
            </View>
          )}
          {children}
        </View>
      </ScrollView>
    </View>
  );
}

/**
 * Kept for call sites; renders immediately. Staggered entrances made screens look like they
 * assembled piece by piece (owner feedback 2026-10-16), so screens now appear whole.
 */
export function Reveal({ children }: { index?: number; children: ReactNode }) {
  return <>{children}</>;
}

/** Section title (Outfit 20) + optional one-line subtitle + optional "Voir plus ›". */
export function SectionHeader({
  title,
  subtitle,
  action,
  onAction,
}: {
  title: string;
  subtitle?: string;
  action?: string;
  onAction?: () => void;
}) {
  const theme = useTheme();
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.titleRow}>
        <AppText variant="title" style={{ flex: 1 }}>
          {title}
        </AppText>
        {action && onAction && (
          <PressableScale accessibilityRole="button" onPress={onAction} hitSlop={10} style={styles.action}>
            <AppText variant="callout" style={{ fontFamily: Fonts.bodyMedium }}>
              {action}
            </AppText>
            <Icon name="chevronRight" size={16} color={theme.text} />
          </PressableScale>
        )}
      </View>
      {subtitle && (
        <AppText variant="callout" color={theme.textSecondary}>
          {subtitle}
        </AppText>
      )}
    </View>
  );
}

/** A titled block: header and content stay together, sections are spaced by the Screen. */
export function Section({
  title,
  subtitle,
  action,
  onAction,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: string;
  onAction?: () => void;
  children: ReactNode;
}) {
  return (
    <View style={{ gap: Spacing.md }}>
      <SectionHeader title={title} subtitle={subtitle} action={action} onAction={onAction} />
      {children}
    </View>
  );
}

/** @deprecated Use SectionHeader. Kept so unmigrated screens follow the new style. */
export function SectionLabel({ children }: { children: string }) {
  return <SectionHeader title={children} />;
}

const styles = StyleSheet.create({
  sectionHeader: { gap: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  action: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  column: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.gutter,
    gap: Spacing.section,
  },
});
