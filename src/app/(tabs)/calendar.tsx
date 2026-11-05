import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, LinearTransition } from 'react-native-reanimated';

import { eventColor, eventKinds } from '@/components/event-style';
import { MonthGrid } from '@/components/month-grid';
import { Screen, Section } from '@/components/screen';
import { normalize, SearchField } from '@/components/search-field';
import { AppText, Card, PressableScale } from '@/components/ui';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n, type Lang } from '@/i18n';
import { buildEvents, parseIso, toIso, type CalendarEvent, type EventKind } from '@/lib/events';
import { formatDayDate, formatTime } from '@/lib/format';
import { useHome } from '@/lib/home';

const UPCOMING_COUNT = 6;

export default function CalendarScreen() {
  const theme = useTheme();
  const { t, lang } = useI18n();
  const { cleanings, contract } = useHome();

  const today = new Date();
  const todayIso = toIso(today);
  const [month, setMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedIso, setSelectedIso] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [hidden, setHidden] = useState<Set<EventKind>>(new Set());

  // Current year and the next one cover any running semester.
  const year = today.getFullYear();
  const allEvents = useMemo(
    () => buildEvents([year, year + 1], { cleanings, ...contract }),
    [year, cleanings, contract],
  );
  const events = useMemo(() => allEvents.filter((e) => !hidden.has(e.kind)), [allEvents, hidden]);

  const kindsByDate = useMemo(() => {
    const map = new Map<string, EventKind[]>();
    for (const e of events) {
      const kinds = map.get(e.date) ?? [];
      if (!kinds.includes(e.kind)) kinds.push(e.kind);
      map.set(e.date, kinds);
    }
    return map;
  }, [events]);

  const monthLabel = month.toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', {
    month: 'long',
    year: 'numeric',
  });

  const q = normalize(query.trim());
  const searchResults = q
    ? allEvents.filter(
        (e) =>
          e.kind !== 'cleaning' && normalize([e.title.fr, e.title.en, e.ptName ?? ''].join(' ')).includes(q),
      )
    : [];
  const selectedEvents = selectedIso ? events.filter((e) => e.date === selectedIso) : [];
  const upcoming = events.filter((e) => e.date >= todayIso).slice(0, UPCOMING_COUNT);

  function shiftMonth(delta: number) {
    setMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1));
    setSelectedIso(null);
  }

  function jumpTo(iso: string) {
    const d = parseIso(iso);
    setMonth(new Date(d.getFullYear(), d.getMonth(), 1));
    setSelectedIso(iso);
    setQuery('');
  }

  function toggleKind(kind: EventKind) {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(kind)) next.delete(kind);
      else next.add(kind);
      return next;
    });
  }

  return (
    <Screen title={t.calendar.title} subtitle={t.calendar.subtitle}>
      <SearchField
        value={query}
        onChangeText={setQuery}
        placeholder={t.calendar.searchPlaceholder}
        clearLabel={t.guide.clear}
      />

      {q ? (
        <Animated.View entering={FadeIn}>
          <Section title={t.calendar.results}>
            {searchResults.length === 0 ? (
              <Card>
                <AppText color={theme.textSecondary}>{t.calendar.noResults(query)}</AppText>
              </Card>
            ) : (
              <EventList events={searchResults} lang={lang} onPress={(e) => jumpTo(e.date)} />
            )}
          </Section>
        </Animated.View>
      ) : (
        <>
          <Card>
            <MonthGrid
              month={month}
              monthLabel={monthLabel}
              todayIso={todayIso}
              selectedIso={selectedIso}
              kindsByDate={kindsByDate}
              weekStartsOn={t.calendar.weekStartsOn}
              weekdaysShort={t.calendar.weekdaysShort}
              prevLabel={t.calendar.previousMonth}
              nextLabel={t.calendar.nextMonth}
              onSelect={(iso) => setSelectedIso(iso === selectedIso ? null : iso)}
              onPrev={() => shiftMonth(-1)}
              onNext={() => shiftMonth(1)}
            />
          </Card>

          <View style={styles.legend}>
            {eventKinds.map((kind) => {
              const active = !hidden.has(kind);
              const color = eventColor(theme, kind);
              return (
                <PressableScale
                  key={kind}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: active }}
                  onPress={() => toggleKind(kind)}
                  style={[
                    styles.chip,
                    { borderColor: theme.line, backgroundColor: active ? theme.surface : theme.fill },
                  ]}>
                  <View
                    style={[
                      styles.dot,
                      active ? { backgroundColor: color } : { borderWidth: 1.5, borderColor: color },
                    ]}
                  />
                  <AppText variant="caption" color={active ? theme.text : theme.textSecondary}>
                    {t.calendar.kinds[kind]}
                  </AppText>
                </PressableScale>
              );
            })}
          </View>

          {selectedIso && (
            <Animated.View entering={FadeInDown.duration(250)}>
              <Section title={capitalize(longDate(selectedIso, lang))}>
                {selectedEvents.length === 0 ? (
                  <Card>
                    <AppText color={theme.textSecondary}>{t.calendar.nothingThisDay}</AppText>
                  </Card>
                ) : (
                  <EventList events={selectedEvents} lang={lang} />
                )}
              </Section>
            </Animated.View>
          )}

          <Section title={t.calendar.upcoming}>
            <EventList events={upcoming} lang={lang} onPress={(e) => jumpTo(e.date)} />
          </Section>

          <AppText variant="caption" color={theme.textSecondary}>
            {t.calendar.optionalHint}
          </AppText>
        </>
      )}
    </Screen>
  );
}

function longDate(iso: string, lang: Lang) {
  return parseIso(iso).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Events in one card: colored dot = kind, title, date (and Portuguese name), kind in its color. */
function EventList({
  events,
  lang,
  onPress,
}: {
  events: CalendarEvent[];
  lang: Lang;
  onPress?: (e: CalendarEvent) => void;
}) {
  const theme = useTheme();
  const { t } = useI18n();
  return (
    <Card style={styles.listCard}>
      {events.map((event, i) => {
        const color = eventColor(theme, event.kind);
        const details = [
          capitalize(formatDayDate(event.date, lang, true)),
          event.time ? formatTime(event.time, lang) : null,
          event.ptName && event.ptName !== event.title[lang] ? event.ptName : null,
        ]
          .filter(Boolean)
          .join(' · ');
        return (
          <Animated.View key={event.id} layout={LinearTransition}>
            {i > 0 && <View style={[styles.divider, { backgroundColor: theme.line }]} />}
            <PressableScale
              disabled={!onPress}
              haptic={!!onPress}
              onPress={onPress ? () => onPress(event) : undefined}
              style={styles.row}>
              <View style={[styles.dot, { backgroundColor: color, marginTop: 7 }]} />
              <View style={{ flex: 1, gap: 2 }}>
                <AppText>{event.title[lang]}</AppText>
                <AppText variant="callout" color={theme.textSecondary}>
                  {details}
                </AppText>
              </View>
              <AppText variant="caption" color={color} style={{ fontFamily: Fonts.bodyMedium }}>
                {t.calendar.kinds[event.kind]}
              </AppText>
            </PressableScale>
          </Animated.View>
        );
      })}
    </Card>
  );
}

const styles = StyleSheet.create({
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 34,
    paddingHorizontal: 12,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  listCard: { paddingVertical: 0 },
  divider: { height: StyleSheet.hairlineWidth },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, paddingVertical: 14 },
});
