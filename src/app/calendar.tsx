import { router, type Href } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, LinearTransition } from 'react-native-reanimated';

import { eventColor, eventKinds } from '@/components/event-style';
import { Icon } from '@/components/icon';
import { MonthGrid } from '@/components/month-grid';
import { Screen, Section } from '@/components/screen';
import { normalize, SearchField } from '@/components/search-field';
import { AppText, Card, PressableScale } from '@/components/ui';
import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n, type Lang } from '@/i18n';
import { tripDates, useCommunity, type ChezEvent, type Trip } from '@/lib/community';
import {
  bhToday,
  buildEvents,
  byDateTime,
  communityEvents,
  daysBetween,
  isOnDay,
  parseIso,
  type CalendarEvent,
  type EventKind,
} from '@/lib/events';
import { formatDayDate, formatTime } from '@/lib/format';
import { useHome } from '@/lib/home';

const UPCOMING_COUNT = 8;

export default function CalendarScreen() {
  const theme = useTheme();
  const { t, lang } = useI18n();
  const { cleanings, contract } = useHome();

  // The calendar's days are Belo Horizonte days, whatever the phone's time zone.
  const todayIso = bhToday();
  const [month, setMonth] = useState(() => {
    const d = parseIso(todayIso);
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selectedIso, setSelectedIso] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [hidden, setHidden] = useState<Set<EventKind>>(new Set());

  // The community's dates (Chez Toi events, my group trips) are a bonus: they join the calendar when they
  // arrive, reload when the screen comes back into view, and the calendar never waits for them nor shows
  // an error when they fail.
  const chezEvents = useCommunity<{ events: ChezEvent[] }>('events').state;
  const groupTrips = useCommunity<{ trips: Trip[] }>('trips').state;
  const community = useMemo(
    () =>
      communityEvents(
        chezEvents.status === 'ready' ? (chezEvents.data.events ?? []) : [],
        groupTrips.status === 'ready' ? (groupTrips.data.trips ?? []) : [],
      ),
    [chezEvents, groupTrips],
  );

  // Current year and the next one cover any running semester.
  const year = Number(todayIso.slice(0, 4));
  const allEvents = useMemo(
    () => [...buildEvents([year, year + 1], { cleanings, ...contract }), ...community].sort(byDateTime),
    [year, cleanings, contract, community],
  );
  const events = useMemo(() => allEvents.filter((e) => !hidden.has(e.kind)), [allEvents, hidden]);

  const kindsByDate = useMemo(() => {
    const map = new Map<string, EventKind[]>();
    for (const e of events) {
      // A group trip marks every day from its start to its end.
      for (const day of e.endDate ? daysBetween(e.date, e.endDate) : [e.date]) {
        const kinds = map.get(day) ?? [];
        if (!kinds.includes(e.kind)) kinds.push(e.kind);
        map.set(day, kinds);
      }
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
          e.kind !== 'cleaning' &&
          normalize([e.title.fr, e.title.en, e.ptName ?? '', e.venue ?? ''].join(' ')).includes(q),
      )
    : [];
  const selectedEvents = selectedIso ? events.filter((e) => isOnDay(e, selectedIso)) : [];
  // A trip that has started stays in the list until its last day.
  const upcoming = events.filter((e) => (e.endDate ?? e.date) >= todayIso).slice(0, UPCOMING_COUNT);

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
    <Screen back title={t.calendar.title} subtitle={t.calendar.subtitle}>
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
              <EventList events={searchResults} lang={lang} onJump={(e) => jumpTo(e.date)} />
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
            <EventList events={upcoming} lang={lang} onJump={(e) => jumpTo(e.date)} />
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

/**
 * Events in one card: colored dot = kind, title, date (and Portuguese name), kind in its color.
 * A Chez Toi event or a group trip opens its page (chevron); the other rows jump to their day when `onJump` is set.
 */
function EventList({
  events,
  lang,
  onJump,
}: {
  events: CalendarEvent[];
  lang: Lang;
  onJump?: (e: CalendarEvent) => void;
}) {
  const theme = useTheme();
  const { t } = useI18n();
  return (
    <Card style={styles.listCard}>
      {events.map((event, i) => {
        const color = eventColor(theme, event.kind);
        const details = [
          event.endDate
            ? capitalize(tripDates(event.date, event.endDate, lang))
            : capitalize(formatDayDate(event.date, lang, true)),
          event.time ? formatTime(event.time, lang) : null,
          event.ptName && event.ptName !== event.title[lang] ? event.ptName : null,
        ]
          .filter(Boolean)
          .join(' · ');
        const href = event.href;
        const onPress = href ? () => router.push(href as Href) : onJump ? () => onJump(event) : undefined;
        return (
          <Animated.View key={event.id} layout={LinearTransition}>
            {i > 0 && <View style={[styles.divider, { backgroundColor: theme.line }]} />}
            <PressableScale
              accessibilityRole={onPress ? 'button' : undefined}
              disabled={!onPress}
              haptic={!!onPress}
              onPress={onPress}
              style={styles.row}>
              <View style={[styles.dot, { backgroundColor: color, marginTop: 7 }]} />
              <View style={{ flex: 1, gap: 2 }}>
                <AppText>{event.title[lang]}</AppText>
                <AppText variant="callout" color={theme.textSecondary}>
                  {details}
                </AppText>
                {event.venue && (
                  <AppText variant="callout" color={theme.textSecondary}>
                    {event.venue}
                  </AppText>
                )}
                {event.going && (
                  <View style={styles.going}>
                    <Icon name="check" size={12} color={theme.success} />
                    <AppText variant="caption" color={theme.success} style={{ fontFamily: Fonts.bodyMedium }}>
                      {t.community.events.myGoing}
                    </AppText>
                  </View>
                )}
              </View>
              {/* Same rule as Home: the title of a cleaning or contract event already says what it is. */}
              {event.kind !== 'cleaning' && event.kind !== 'contract' && (
                <AppText variant="caption" color={color} style={styles.kind}>
                  {t.calendar.kinds[event.kind]}
                </AppText>
              )}
              {href && (
                <View style={styles.chevron}>
                  <Icon name="chevronRight" size={14} color={theme.textTertiary} />
                </View>
              )}
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
  going: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  chevron: { marginTop: 3, marginLeft: -Spacing.xs },
  // The kind never squeezes the title into a narrow column: it wraps on its own instead.
  kind: { fontFamily: Fonts.bodyMedium, maxWidth: '38%', textAlign: 'right' },
});
