import { Children, Fragment, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon, type IconName } from '@/components/icon';
import { AppText, tapFeedback } from '@/components/ui';
import { Fonts } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** v3 (2026-11-08): the icon sits in a tinted circle, as in Revolut. */
const ICON_SIZE = 36;
const ICON_GAP = 12;

/**
 * Rows separated by hairlines, no outer box (iOS inset-grouped feel, without the grey canvas).
 * Dividers start where the text starts, so leading icons stay in a clean column.
 */
export function ListGroup({ children, inset = false }: { children: ReactNode; inset?: boolean }) {
  const theme = useTheme();
  const rows = Children.toArray(children).filter(Boolean);
  return (
    <View>
      {rows.map((row, i) => (
        <Fragment key={i}>
          {i > 0 && (
            <View
              style={[
                styles.divider,
                { backgroundColor: theme.line, marginLeft: inset ? ICON_SIZE + ICON_GAP : 0 },
              ]}
            />
          )}
          {row}
        </Fragment>
      ))}
    </View>
  );
}

export function ListRow({
  title,
  subtitle,
  subtitleColor,
  value,
  icon,
  muted = false,
  onPress,
  accessory,
  accessibilityLabel,
}: {
  title: string;
  subtitle?: string;
  subtitleColor?: string;
  /** Short text on the right (e.g. "R$ 2 400", "Copier"). */
  value?: string;
  icon?: IconName;
  /** Gray title and icon, for something that isn't relevant yet. */
  muted?: boolean;
  onPress?: () => void;
  /** Replaces the default chevron. */
  accessory?: ReactNode;
  accessibilityLabel?: string;
}) {
  const theme = useTheme();

  const content = (pressed: boolean) => (
    <View style={[styles.row, pressed && { opacity: 0.55 }]}>
      {icon && (
        <View style={[styles.iconCircle, { backgroundColor: muted ? theme.fill : theme.brandSoft }]}>
          <Icon name={icon} size={18} color={muted ? theme.textTertiary : theme.brand} />
        </View>
      )}
      <View style={styles.text}>
        <AppText color={muted ? theme.textSecondary : undefined} style={{ fontFamily: Fonts.bodyMedium }}>
          {title}
        </AppText>
        {subtitle && (
          <AppText variant="callout" color={subtitleColor ?? theme.textSecondary}>
            {subtitle}
          </AppText>
        )}
      </View>
      {value && (
        <AppText variant="callout" color={theme.textSecondary} style={styles.value}>
          {value}
        </AppText>
      )}
      {accessory ?? (onPress && <Icon name="chevronRight" size={15} color={theme.textTertiary} />)}
    </View>
  );

  if (!onPress) return content(false);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={() => {
        tapFeedback();
        onPress();
      }}>
      {({ pressed }) => content(pressed)}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  divider: { height: StyleSheet.hairlineWidth },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ICON_GAP,
    minHeight: 60,
    paddingVertical: 12,
  },
  iconCircle: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    borderRadius: ICON_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1, gap: 2 },
  value: { maxWidth: '45%', textAlign: 'right' },
});
