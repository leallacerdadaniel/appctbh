import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { RowPill } from '@/components/home-v3';
import { ListGroup, ListRow } from '@/components/list';
import { capitalize, RecapEntry, useMonthName } from '@/components/recap-ui';
import { Screen, Section } from '@/components/screen';
import { AppText, Card } from '@/components/ui';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { useHome } from '@/lib/home';
import { useJournal, useJournalTracker } from '@/lib/journal';
import { placesCount, recapMonths, semesterRange, type RecapMonth } from '@/lib/recap';
import { useVisits } from '@/lib/visited';

/**
 * "Mes récaps": the semester recap at the end of the stay, one card per month (ready / in progress) with
 * the story and the month's journal and photos, and "Ta carte de BH" (location opt-in).
 */
export default function RecapHubScreen() {
  const { t } = useI18n();
  const home = useHome();
  useJournalTracker();
  const { journal } = useJournal();
  const [today] = useState(() => new Date());
  const months = recapMonths(home, today);
  const semester = semesterRange(home, today);
  const h = t.recap.hub;

  return (
    <Screen back title={h.title} subtitle={h.subtitle}>
      {semester && <RecapEntry />}

      <Section title={h.months}>
        {months.length === 0 ? (
          <Card>
            <AppText>{h.empty}</AppText>
          </Card>
        ) : (
          <View style={{ gap: Spacing.md }}>
            {months.map((m) => (
              <MonthCard key={m.month} month={m} />
            ))}
          </View>
        )}
      </Section>

      <Card style={{ paddingVertical: 0 }}>
        <ListGroup inset>
          <ListRow
            icon="map"
            title={h.map}
            subtitle={journal.optIn ? h.mapOn(journal.pings.length) : h.mapOff}
            onPress={() => router.push('/recap/location')}
          />
        </ListGroup>
      </Card>
    </Screen>
  );
}

function MonthCard({ month }: { month: RecapMonth }) {
  const theme = useTheme();
  const { t } = useI18n();
  const monthName = useMonthName();
  const visits = useVisits();
  const { journal, photoUri } = useJournal();
  const h = t.recap.hub;
  const places = placesCount(visits.visits, journal, month.from, month.to);
  const photos = journal.photos.filter((p) => p.month === month.month);
  const ready = month.status === 'ready';
  const summary = [places > 0 && h.places(places), photos.length > 0 && h.photos(photos.length)].filter(Boolean).join(' · ');

  return (
    <Card style={{ gap: Spacing.md }}>
      <View style={styles.head}>
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="title">{capitalize(monthName(month.month))}</AppText>
          {!!summary && (
            <AppText variant="callout" color={theme.textSecondary}>
              {summary}
            </AppText>
          )}
        </View>
        <View style={[styles.status, { backgroundColor: ready ? theme.successSoft : theme.fill }]}>
          <AppText variant="caption" color={ready ? theme.success : theme.textSecondary} style={{ fontFamily: Fonts.bodySemi }}>
            {ready ? h.ready : h.progress}
          </AppText>
        </View>
      </View>
      {photos.length > 0 && (
        <View style={styles.thumbs}>
          {photos.slice(0, 4).map((p) => (
            <Image key={p.id} source={{ uri: photoUri(p) }} style={styles.thumb} contentFit="cover" accessible={false} />
          ))}
        </View>
      )}
      <View style={styles.actions}>
        <RowPill primary label={h.watch} onPress={() => router.push(`/recap/${month.month}`)} />
        <RowPill
          label={h.journal}
          onPress={() => router.push({ pathname: '/recap/timeline', params: { month: month.month } })}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  status: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.pill },
  thumbs: { flexDirection: 'row', gap: Spacing.sm },
  thumb: { width: 56, height: 56, borderRadius: 12 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
});
