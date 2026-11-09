import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import { AppText, Avatar, PressableScale, tapFeedback } from '@/components/ui';
import { Fonts, Radius, TapTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { ChoreMember } from '@/lib/chores';

/**
 * Building blocks of the house chores screens. The chore's emoji is its category marker, chosen by
 * the roommates, so it sits in a small `fill` circle like a mini CategoryCircle.
 */

/** The chore's emoji in a `fill` circle. */
export function ChoreBadge({ emoji, size = 40 }: { emoji: string; size?: number }) {
  const theme = useTheme();
  return (
    <View
      style={[styles.badge, { width: size, height: size, borderRadius: size / 2, backgroundColor: theme.fill }]}>
      <Text style={{ fontSize: size * 0.5, lineHeight: size * 0.62 }} allowFontScaling={false}>
        {emoji}
      </Text>
    </View>
  );
}

/**
 * A row with the chore badge in front (same rhythm as ListRow). Either pressable (opens the chore)
 * or with an action in `accessory` (the done tick), never both.
 */
export function ChoreRow({
  emoji,
  title,
  subtitle,
  subtitleColor,
  accessory,
  onPress,
  children,
  accessibilityLabel,
}: {
  emoji: string;
  title: string;
  subtitle?: string;
  subtitleColor?: string;
  accessory?: ReactNode;
  onPress?: () => void;
  /** Extra content under the subtitle (the "Échanger" button). */
  children?: ReactNode;
  accessibilityLabel?: string;
}) {
  const theme = useTheme();
  const content = (pressed: boolean) => (
    <View style={[styles.row, pressed && { opacity: 0.55 }]}>
      <ChoreBadge emoji={emoji} />
      <View style={styles.text}>
        <AppText>{title}</AppText>
        {subtitle ? (
          <AppText variant="callout" color={subtitleColor ?? theme.textSecondary}>
            {subtitle}
          </AppText>
        ) : null}
        {children}
      </View>
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

/** Round tick, 44 pt: empty circle while to do, green check once done. */
export function DoneToggle({ done, label, onPress }: { done: boolean; label: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <PressableScale
      accessibilityRole="checkbox"
      accessibilityState={{ checked: done }}
      accessibilityLabel={label}
      onPress={onPress}
      style={styles.toggle}>
      <Icon
        name={done ? 'checkCircleFill' : 'circle'}
        size={28}
        color={done ? theme.success : theme.textTertiary}
      />
    </PressableScale>
  );
}

/** Small `fill` pill with an icon and a label ("Échanger"), 32 pt tall with a 44 pt touch area. */
export function PillButton({
  icon,
  label,
  onPress,
}: {
  icon: 'swap';
  label: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <PressableScale
      accessibilityRole="button"
      onPress={onPress}
      hitSlop={PILL_SLOP}
      style={[styles.pill, { backgroundColor: theme.fill }]}>
      <Icon name={icon} size={14} color={theme.text} />
      <AppText variant="caption" style={{ fontFamily: Fonts.bodyMedium }}>
        {label}
      </AppText>
    </PressableScale>
  );
}

/**
 * Turn order: roommates as avatars, tapped in order. Chosen ones show their place ("1re", "2e")
 * under a dark ring; tapping one again takes it out of the order.
 */
export function RotationPicker({
  members,
  me,
  meLabel,
  order,
  positionLabel,
  onPress,
}: {
  members: ChoreMember[];
  me: string;
  meLabel: string;
  order: string[];
  positionLabel: (n: number) => string;
  onPress: (id: string) => void;
}) {
  const theme = useTheme();
  // The student first, then the roommates (same as the expenses pickers).
  const ordered = [...members.filter((m) => m.id === me), ...members.filter((m) => m.id !== me)];
  return (
    <View style={styles.people}>
      {ordered.map((m) => {
        const place = order.indexOf(m.id);
        const on = place >= 0;
        const label = m.id === me ? meLabel : m.firstName;
        return (
          <PressableScale
            key={m.id}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            accessibilityLabel={on ? `${label}, ${positionLabel(place + 1)}` : label}
            onPress={() => onPress(m.id)}
            style={styles.person}>
            <View style={[styles.ring, { borderColor: on ? theme.text : 'transparent' }]}>
              <Avatar initials={m.initials} size={48} />
            </View>
            {on && (
              <View style={[styles.place, { backgroundColor: theme.text, borderColor: theme.surface }]}>
                <AppText variant="caption" color={theme.surface} style={{ fontFamily: Fonts.bodyMedium }}>
                  {place + 1}
                </AppText>
              </View>
            )}
            <AppText
              variant="caption"
              color={on ? theme.text : theme.textSecondary}
              style={[{ textAlign: 'center' }, on && { fontFamily: Fonts.bodyMedium }]}>
              {label}
            </AppText>
          </PressableScale>
        );
      })}
    </View>
  );
}

/** Emoji choices as 48 pt `fill` circles; the chosen one gets a dark ring. */
export function EmojiPicker({
  options,
  value,
  onChange,
  labelFor,
}: {
  options: string[];
  value: string;
  onChange: (emoji: string) => void;
  labelFor: (emoji: string) => string;
}) {
  const theme = useTheme();
  return (
    <View style={styles.emojiGrid}>
      {options.map((e) => {
        const on = e === value;
        return (
          <PressableScale
            key={e}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            accessibilityLabel={labelFor(e)}
            onPress={() => onChange(e)}
            style={[styles.emojiRing, { borderColor: on ? theme.text : 'transparent' }]}>
            <ChoreBadge emoji={e} size={44} />
          </PressableScale>
        );
      })}
    </View>
  );
}

const PILL_HEIGHT = 32;
const PILL_SLOP = { top: (TapTarget - PILL_HEIGHT) / 2, bottom: (TapTarget - PILL_HEIGHT) / 2 };

const styles = StyleSheet.create({
  badge: { alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 64, paddingVertical: 12 },
  text: { flex: 1, gap: 2 },
  toggle: { width: TapTarget, height: TapTarget, alignItems: 'center', justifyContent: 'center', marginRight: -8 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    height: PILL_HEIGHT,
    paddingHorizontal: 12,
    marginTop: 8,
    borderRadius: Radius.pill,
  },
  people: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  person: { alignItems: 'center', gap: 6, width: 64 },
  ring: { borderWidth: 2, borderRadius: 28, padding: 2 },
  place: {
    position: 'absolute',
    top: 0,
    right: 4,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 4,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  emojiRing: { borderWidth: 2, borderRadius: 26, padding: 2 },
});
