import { useState, type ReactNode } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BRAND_BAR_HEIGHT, BrandBar } from '@/components/brand-bar';
import { FocusStatusBar } from '@/components/focus-status-bar';
import { TabHeader } from '@/components/tab-header';
import { AppText, PressableScale } from '@/components/ui';
import { Fonts, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Every screen. Pushed screens (`back`): red BrandBar with the back arrow. Tab screens (v3, 2026-11-08):
 * light canvas under the status bar, then the TabHeader row (profile, ask the assistant, bell), which
 * scrolls with the content like in Revolut; `bar="none"` leaves the top to the screen (Explorer's search).
 * `onPhoto` is for a tab that starts with a full-bleed photo in `header`: no canvas under the status bar,
 * white status bar text, and the header draws its own top row.
 * `onRefresh` adds pull-to-refresh (the spinner shows until the promise settles).
 */
export function Screen({
  title,
  subtitle,
  children,
  header,
  back = false,
  bar = 'default',
  onPhoto = false,
  onRefresh,
}: {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  header?: ReactNode;
  back?: boolean;
  bar?: 'default' | 'none';
  onPhoto?: boolean;
  onRefresh?: () => Promise<unknown>;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  // `onPhoto`: once the photo has scrolled away, the canvas comes back under a dark status bar.
  const [pastPhoto, setPastPhoto] = useState(false);
  const tab = !back;
  const photoTop = onPhoto && !pastPhoto;
  const barHeight = insets.top + BRAND_BAR_HEIGHT;

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
      {back ? <BrandBar back overlay /> : <FocusStatusBar style={photoTop ? 'light' : 'dark'} />}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          // Pushed screens: the red bar floats over the top, and the content starts under it.
          paddingTop: back ? barHeight : 0,
          paddingBottom: back ? insets.bottom + Spacing.xl : Spacing.xl + Spacing.md,
        }}
        scrollIndicatorInsets={back ? { top: barHeight } : undefined}
        keyboardShouldPersistTaps="handled"
        scrollEventThrottle={onPhoto ? 32 : undefined}
        onScroll={
          onPhoto
            ? (e) => {
                const past = e.nativeEvent.contentOffset.y > PHOTO_SCROLL;
                if (past !== pastPhoto) setPastPhoto(past);
              }
            : undefined
        }
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              tintColor={theme.textSecondary}
              colors={[theme.textSecondary]}
              progressViewOffset={tab ? insets.top : barHeight}
            />
          ) : undefined
        }>
        {tab && !onPhoto && bar === 'default' && (
          <View style={[styles.column, { paddingTop: insets.top + Spacing.sm }]}>
            <TabHeader />
          </View>
        )}
        {header}
        <View
          style={[
            styles.column,
            { paddingTop: tab && !onPhoto && bar === 'none' && !header ? insets.top + Spacing.sm : Spacing.lg },
          ]}>
          {title && (
            <View style={{ gap: Spacing.xs, marginBottom: tab ? 0 : Spacing.sm }}>
              <AppText variant="display">{title}</AppText>
              {subtitle && <AppText color={theme.textSecondary}>{subtitle}</AppText>}
            </View>
          )}
          {children}
        </View>
      </ScrollView>
      {/* Tab screens: the canvas color stays under the status bar while the content scrolls. */}
      {tab && !photoTop && (
        <View
          pointerEvents="none"
          style={[styles.statusMask, { height: insets.top, backgroundColor: theme.background }]}
        />
      )}
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

/** Section title (Plus Jakarta Sans bold) + optional one-line subtitle + optional red link on the right (v3). */
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
            <AppText variant="callout" color={theme.brand} style={{ fontFamily: Fonts.bodySemi }}>
              {action}
            </AppText>
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

/** How far the arrival photo scrolls before the status bar turns dark over the canvas. */
const PHOTO_SCROLL = 220;

const styles = StyleSheet.create({
  statusMask: { position: 'absolute', top: 0, left: 0, right: 0 },
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
