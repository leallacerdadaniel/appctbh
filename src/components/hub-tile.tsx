import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import { AppText, PressableScale } from '@/components/ui';
import { Fonts, Radius, Shadow, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Entry to a sub-page: emoji, title and a live one-line status ("Mer. 21 oct · 10h00"),
 * so the student often gets the answer without opening the page.
 */
export function HubTile({
  emoji,
  title,
  status,
  onPress,
}: {
  emoji: string;
  title: string;
  status: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${status}`}
      onPress={onPress}
      style={[styles.tile, Shadow.card, { backgroundColor: theme.surface }]}>
      <View style={styles.top}>
        <Text style={styles.emoji} allowFontScaling={false}>
          {emoji}
        </Text>
        <Icon name="chevronRight" size={15} color={theme.textTertiary} />
      </View>
      <View style={{ gap: 2 }}>
        <AppText style={{ fontFamily: Fonts.bodyMedium }}>{title}</AppText>
        <AppText variant="caption" color={theme.textSecondary}>
          {status}
        </AppText>
      </View>
    </PressableScale>
  );
}

/** Two tiles per row. */
export function HubGrid({ children }: { children: ReactNode }) {
  return <View style={styles.grid}>{children}</View>;
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile: {
    flexBasis: '47%',
    flexGrow: 1,
    minHeight: 124,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  top: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  emoji: { fontSize: 28, lineHeight: 34 },
});
