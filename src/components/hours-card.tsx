import { StyleSheet, View } from 'react-native';

import { Section } from '@/components/screen';
import { AppText, Card } from '@/components/ui';
import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { hoursFor, isOpenNow, type Period } from '@/lib/restaurants';

/** Monday first, like Google shows opening hours. */
const WEEK = [1, 2, 3, 4, 5, 6, 0];

/** Week of opening hours (from Google), today in medium weight, "open now" in the section subtitle. */
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
      <Card style={{ gap: Spacing.sm }}>
        {WEEK.map((day) => {
          const ranges = hoursFor({ hours }, day, lang);
          const isToday = day === today;
          const weight = isToday ? { fontFamily: Fonts.bodyMedium } : undefined;
          return (
            <View key={day} style={styles.row}>
              <AppText style={weight}>
                {t.weekdays[day]}
                {isToday ? ` · ${t.restaurants.today}` : ''}
              </AppText>
              <AppText color={ranges.length ? theme.text : theme.textSecondary} style={[styles.value, weight]}>
                {ranges.length ? ranges.join(' · ') : t.restaurants.closed}
              </AppText>
            </View>
          );
        })}
      </Card>
    </Section>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.md },
  value: { textAlign: 'right', flexShrink: 1 },
});
