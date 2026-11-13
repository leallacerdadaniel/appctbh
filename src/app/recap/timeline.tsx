import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { Icon, type IconName } from '@/components/icon';
import { ListGroup, ListRow } from '@/components/list';
import { capitalize, KIND_ICONS, useMonthName } from '@/components/recap-ui';
import { Screen, Section } from '@/components/screen';
import { AppText, Button, Card, InlineMessage, PressableScale } from '@/components/ui';
import { Fonts, Radius, Spacing, TapTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { formatDayDate } from '@/lib/format';
import { useHome } from '@/lib/home';
import { addPhotos, MAX_PHOTOS, useJournal, useJournalTracker, type RecapPhoto } from '@/lib/journal';
import { monthSpan, recapMonths, thisMonth, timelineEntries, type TimelineEntry } from '@/lib/recap';
import { useVisits } from '@/lib/visited';

/**
 * The month's journal (`/recap/timeline?month=2026-10`): the photos of the month (up to 6, added from the
 * gallery, kept on the phone) and, day by day, the places and cities that will count in the recap.
 * Anything can be removed: a check-in, a point of "Ta carte de BH", the place of a photo.
 */
export default function RecapTimelineScreen() {
  const theme = useTheme();
  const { t, lang } = useI18n();
  const home = useHome();
  useJournalTracker();
  const monthName = useMonthName();
  const params = useLocalSearchParams<{ month?: string }>();
  const [today] = useState(() => new Date());
  const month = params.month && /^\d{4}-\d{2}$/.test(params.month) ? params.month : thisMonth(today);
  const span = monthSpan(home, month, today);
  const visits = useVisits();
  const journal = useJournal();
  const j = t.recap.journal;

  const entries = span ? timelineEntries(visits.visits, journal.journal, span.from, span.to) : [];
  const photos = journal.journal.photos.filter((p) => p.month === month);
  const days = [...new Set([...entries.map((e) => e.day), ...photos.flatMap((p) => (p.day && span && p.day >= span.from && p.day <= span.to ? [p.day] : []))])].sort();
  const available = recapMonths(home, today).some((m) => m.month === month);

  function remove(e: TimelineEntry) {
    if (e.source === 'checkin') visits.remove(e.refId);
    else if (e.source === 'location') journal.removePing(e.refId);
    else journal.forgetPhotoPlace(e.refId);
  }

  return (
    <Screen back title={capitalize(j.title(monthName(month)))} subtitle={j.subtitle}>
      {span && <PhotosSection month={month} photos={photos} />}

      <Section title={j.days}>
        {days.length === 0 ? (
          <Card>
            <AppText color={theme.textSecondary}>{j.empty}</AppText>
          </Card>
        ) : (
          <View style={{ gap: Spacing.lg }}>
            {days.map((day) => (
              <View key={day} style={{ gap: Spacing.sm }}>
                <AppText variant="callout" color={theme.textSecondary} style={{ fontFamily: Fonts.bodySemi }}>
                  {capitalize(formatDayDate(day, lang))}
                </AppText>
                <Card style={{ paddingVertical: 0 }}>
                  {entries
                    .filter((e) => e.day === day)
                    .map((e, i) => (
                      <EntryRow key={e.key} entry={e} first={i === 0} onRemove={() => remove(e)} />
                    ))}
                  <DayPhotos photos={photos.filter((p) => p.day === day)} uri={journal.photoUri} />
                </Card>
              </View>
            ))}
          </View>
        )}
      </Section>

      <Card style={{ paddingVertical: 0 }}>
        <ListGroup inset>
          {available && <ListRow icon="play" title={j.watch} onPress={() => router.push(`/recap/${month}`)} />}
          <ListRow icon="map" title={t.recap.location.title} onPress={() => router.push('/recap/location')} />
        </ListGroup>
      </Card>
    </Screen>
  );
}

function PhotosSection({ month, photos }: { month: string; photos: RecapPhoto[] }) {
  const theme = useTheme();
  const { t } = useI18n();
  const j = t.recap.journal;
  const { email, photoUri, removePhoto } = useJournal();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const full = photos.length >= MAX_PHOTOS;

  async function add() {
    setError(null);
    setBusy(true);
    try {
      const result = await addPhotos(email, month);
      if (result === 'failed') setError(j.error);
    } catch {
      setError(j.error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Section title={j.photos} subtitle={j.photosHint(photos.length, MAX_PHOTOS)}>
      <Card style={{ gap: Spacing.md }}>
        {photos.length > 0 && (
          <View style={styles.grid}>
            {photos.map((p) => (
              <View key={p.id} style={styles.cell}>
                <Image source={{ uri: photoUri(p) }} style={styles.photo} contentFit="cover" accessible={false} />
                <PressableScale
                  accessibilityRole="button"
                  accessibilityLabel={j.removePhoto}
                  hitSlop={8}
                  onPress={() => removePhoto(p.id)}
                  style={[styles.removePhoto, { backgroundColor: theme.scrim }]}>
                  <Icon name="close" size={16} color={theme.onBrand} />
                </PressableScale>
              </View>
            ))}
          </View>
        )}
        {Platform.OS === 'web' ? (
          <AppText color={theme.textSecondary}>{j.web}</AppText>
        ) : full ? (
          <AppText color={theme.textSecondary}>{j.full}</AppText>
        ) : (
          <Button
            variant="secondary"
            label={j.add}
            loading={busy}
            icon={<Icon name="photo" size={17} color={theme.text} />}
            onPress={add}
          />
        )}
        {error && <InlineMessage kind="error" text={error} />}
      </Card>
    </Section>
  );
}

function EntryRow({ entry, first, onRemove }: { entry: TimelineEntry; first: boolean; onRemove: () => void }) {
  const theme = useTheme();
  const { t } = useI18n();
  const j = t.recap.journal;
  const icon: IconName = entry.place ? KIND_ICONS[entry.place.kind] : entry.outside ? 'travel' : 'address';
  const title = entry.place?.name ?? (entry.outside ? entry.city ?? j.outside : entry.neighborhood ?? entry.city ?? j.bh);
  const detail = entry.place
    ? [t.recap.kinds[entry.place.kind], entry.neighborhood]
    : entry.outside
      ? [entry.city ? j.outside : null]
      : [entry.neighborhood ? entry.city ?? j.bh : null];
  const subtitle = [...detail, j.sources[entry.source]].filter(Boolean).join(' · ');

  return (
    <View style={[styles.row, !first && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.line }]}>
      <View style={[styles.circle, { backgroundColor: entry.outside ? theme.infoSoft : theme.brandSoft }]}>
        <Icon name={icon} size={18} color={entry.outside ? theme.info : theme.brand} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <AppText style={{ fontFamily: Fonts.bodySemi }}>{title}</AppText>
        <AppText variant="caption" color={theme.textSecondary}>
          {subtitle}
        </AppText>
      </View>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={j.remove(title)}
        onPress={onRemove}
        style={styles.remove}>
        <Icon name="close" size={16} color={theme.textSecondary} />
      </PressableScale>
    </View>
  );
}

function DayPhotos({ photos, uri }: { photos: RecapPhoto[]; uri: (p: RecapPhoto) => string }) {
  if (!photos.length) return null;
  return (
    <View style={styles.dayPhotos}>
      {photos.map((p) => (
        <Image key={p.id} source={{ uri: uri(p) }} style={styles.dayPhoto} contentFit="cover" accessible={false} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  cell: { width: '31.5%', aspectRatio: 1 },
  photo: { width: '100%', height: '100%', borderRadius: Radius.md },
  removePhoto: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, paddingVertical: 12 },
  circle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  remove: { width: TapTarget, height: TapTarget, alignItems: 'center', justifyContent: 'center', marginRight: -10 },
  dayPhotos: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, paddingVertical: 12 },
  dayPhoto: { width: 52, height: 52, borderRadius: 10 },
});
