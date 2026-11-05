import { StyleSheet, View } from 'react-native';

import { Section } from '@/components/screen';
import { AppText, Card } from '@/components/ui';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { hoursFor, isOpenNow, type Period } from '@/lib/restaurants';

/** Monday first, like Google shows opening hours. */
const WEEK = [1, 2, 3, 4, 5, 6, 0];

/** Full hours need no minutes: "8:00 AM–12:00 PM" → "8 AM–12 PM", "8h00–12h00" → "8h–12h". */
const compact = (range: string) => range.replace(/:00(?= [AP]M)/g, '').replace(/h00/g, 'h');

/** Week of opening hours (from Google): one row per day, today highlighted, "open now" in the subtitle. */
export function HoursCard({ hours }: { hours: Period[] }) {
  const theme = useTheme();
  const { t, lang } = useI18n();
  if (!hours.length) return null;

  const open = isOpenNow({ hours });
  const today = new Date().getDay();

  return (
    <Section
      title={t.restaurants.hours}
      subtitle={open == null ? undefined : open ? t.restaurants.openNow : t.restaurants.closedNow}>
      <Card style={styles.card}>
        {WEEK.map((day, index) => {
          const ranges = hoursFor({ hours }, day, lang);
          const isToday = day === today;
          const weight = isToday ? { fontFamily: Fonts.bodyMedium } : undefined;
          return (
            <View
              key={day}
              style={[
                styles.row,
                isToday && { backgroundColor: theme.fill },
                // Hairlines between days, none around the highlighted row.
                index > 0 && !isToday && day !== (today + 1) % 7 && {
                  borderTopColor: theme.line,
                  borderTopWidth: StyleSheet.hairlineWidth,
                },
              ]}>
              <AppText variant="caption" color={isToday ? theme.brand : theme.text} style={[styles.day, weight]}>
                {isToday ? t.restaurants.today : t.weekdays[day]}
              </AppText>
              <View style={styles.ranges}>
                {ranges.length ? (
                  // A second range drops to the next line whole, never cut in the middle.
                  ranges.map((range) => (
                    <AppText key={range} variant="caption" numberOfLines={1} style={weight}>
                      {compact(range)}
                    </AppText>
                  ))
                ) : (
                  <AppText variant="caption" color={theme.textSecondary} style={weight}>
                    {t.restaurants.closed}
                  </AppText>
                )}
              </View>
            </View>
          );
        })}
      </Card>
    </Section>
  );
}

const styles = StyleSheet.create({
  card: { padding: Spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: 10,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.sm,
  },
  day: { width: 92 },
  ranges: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', columnGap: Spacing.md },
});
