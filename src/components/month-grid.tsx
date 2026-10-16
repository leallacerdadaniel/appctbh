import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useMemo } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { eventColor } from '@/components/event-style';
import { AppText, PressableScale } from '@/components/ui';
import { Brand, Fonts, Radius, Spacing, TapTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { toIso, type EventKind } from '@/lib/events';

type Props = {
  month: Date; // any day in the displayed month
  monthLabel: string;
  todayIso: string;
  selectedIso: string | null;
  kindsByDate: Map<string, EventKind[]>;
  weekStartsOn: number; // 0 = Sunday, 1 = Monday
  weekdaysShort: string[]; // Sunday-first
  prevLabel: string;
  nextLabel: string;
  onSelect: (iso: string) => void;
  onPrev: () => void;
  onNext: () => void;
};

const SWIPE_DISTANCE = 50;

export function MonthGrid(props: Props) {
  const theme = useTheme();
  const { month, weekStartsOn } = props;

  const days = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const offset = (first.getDay() - weekStartsOn + 7) % 7;
    const start = new Date(first);
    start.setDate(first.getDate() - offset);
    // Always 6 rows so the card height never jumps between months.
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return { iso: toIso(d), day: d.getDate(), inMonth: d.getMonth() === month.getMonth() };
    });
  }, [month, weekStartsOn]);

  const header = Array.from({ length: 7 }, (_, i) => props.weekdaysShort[(i + weekStartsOn) % 7]);

  // Horizontal swipe changes month (works on touch and with a mouse drag on web).
  const { onPrev, onNext } = props;
  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) =>
          Math.abs(g.dx) > 15 && Math.abs(g.dx) > Math.abs(g.dy),
        onPanResponderRelease: (_, g) => {
          if (g.dx < -SWIPE_DISTANCE) onNext();
          else if (g.dx > SWIPE_DISTANCE) onPrev();
        },
      }),
    [onPrev, onNext],
  );

  return (
    <View {...pan.panHandlers} style={{ gap: Spacing.sm }}>
      <View style={styles.nav}>
        <NavButton label={props.prevLabel} onPress={props.onPrev}>
          <ChevronLeft size={20} color={theme.text} />
        </NavButton>
        <Animated.View key={props.monthLabel} entering={FadeIn.duration(220)}>
          <AppText variant="heading" style={{ textTransform: 'capitalize' }}>
            {props.monthLabel}
          </AppText>
        </Animated.View>
        <NavButton label={props.nextLabel} onPress={props.onNext}>
          <ChevronRight size={20} color={theme.text} />
        </NavButton>
      </View>

      <View style={styles.week}>
        {header.map((w, i) => (
          <AppText key={i} variant="caption" color={theme.textSecondary} style={styles.weekday}>
            {w}
          </AppText>
        ))}
      </View>

      <Animated.View key={toIso(month)} entering={FadeIn.duration(220)} style={styles.grid}>
        {days.map(({ iso, day, inMonth }) => {
          const isToday = iso === props.todayIso;
          const isSelected = iso === props.selectedIso;
          const kinds = props.kindsByDate.get(iso) ?? [];
          return (
            <PressableScale
              key={iso}
              disabled={!inMonth}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              onPress={() => props.onSelect(iso)}
              style={styles.cell}>
              <View
                style={[
                  styles.dayCircle,
                  isToday && { backgroundColor: Brand.red },
                  isSelected && !isToday && { borderWidth: 1.5, borderColor: theme.text },
                ]}>
                <AppText
                  color={isToday ? '#fff' : inMonth ? theme.text : theme.line}
                  style={isToday || isSelected ? { fontFamily: Fonts.bodySemiBold } : undefined}>
                  {day}
                </AppText>
              </View>
              <View style={styles.dots}>
                {inMonth &&
                  kinds.slice(0, 3).map((k) => (
                    <View key={k} style={[styles.dot, { backgroundColor: eventColor(theme, k) }]} />
                  ))}
              </View>
            </PressableScale>
          );
        })}
      </Animated.View>
    </View>
  );
}

function NavButton({
  label,
  onPress,
  children,
}: {
  label: string;
  onPress: () => void;
  children: React.ReactNode;
}) {
  const theme = useTheme();
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={[styles.navButton, { backgroundColor: theme.background }]}>
      {children}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navButton: {
    width: TapTarget,
    height: TapTarget,
    borderRadius: TapTarget / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  week: { flexDirection: 'row' },
  weekday: { flex: 1, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 2, minHeight: TapTarget + 6 },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dots: { flexDirection: 'row', gap: 3, height: 6, marginTop: 2 },
  dot: { width: 5, height: 5, borderRadius: 3 },
});
