import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Scrollable tab screen with a large title and centered max-width column. */
export function Screen({
  title,
  subtitle,
  children,
  header,
}: {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  header?: ReactNode;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
      keyboardShouldPersistTaps="handled">
      {header}
      <View
        style={[
          styles.column,
          { paddingTop: header ? Spacing.lg : insets.top + Spacing.xl },
        ]}>
        {title && (
          <View style={{ gap: Spacing.xs, marginBottom: Spacing.sm }}>
            <AppText variant="title">{title}</AppText>
            {subtitle && <AppText color={theme.textSecondary}>{subtitle}</AppText>}
          </View>
        )}
        {children}
      </View>
    </ScrollView>
  );
}

/** Staggered entrance for stacked sections. */
export function Reveal({ index = 0, children }: { index?: number; children: ReactNode }) {
  return (
    <Animated.View entering={FadeInDown.delay(60 * index).duration(320)}>{children}</Animated.View>
  );
}

export function SectionLabel({ children }: { children: string }) {
  const theme = useTheme();
  return (
    <AppText
      variant="caption"
      color={theme.textSecondary}
      style={{ textTransform: 'uppercase', letterSpacing: 0.8, marginTop: Spacing.sm }}>
      {children}
    </AppText>
  );
}

const styles = StyleSheet.create({
  column: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.md,
    gap: Spacing.md,
  },
});
