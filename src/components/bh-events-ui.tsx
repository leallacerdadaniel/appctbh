import { Image } from 'expo-image';
import { router, type Href } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';

import { Icon, type IconName } from '@/components/icon';
import { Section } from '@/components/screen';
import { AppText, Card, Chip, LoadingState, PressableScale, RetryCard } from '@/components/ui';
import { Fonts, Radius, Shadow, Spacing, TapTarget, type ThemeColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n, type Lang } from '@/i18n';
import type { Strings } from '@/i18n/strings';
import {
  BH_EVENT_CATEGORIES,
  OFFICIAL_AGENDA_URL,
  addDays,
  bhDay,
  bhTime,
  groupByDay,
  isOngoing,
  isThisWeekend,
  lastDay,
  thisWeek,
  todayBh,
  useBhEvents,
  type BhEvent,
  type BhEventCategory,
} from '@/lib/bh-events';
import { formatBrl, formatDayDate, formatTime } from '@/lib/format';

/* ---------- Labels ---------- */

const CATEGORY_ICONS: Record<BhEventCategory, IconName> = {
  show: 'music',
  party: 'party',
  exhibition: 'exhibition',
  theatre: 'culture',
  festival: 'festival',
  other: 'calendar',
};

function categoryTint(category: BhEventCategory, theme: ThemeColors) {
  switch (category) {
    case 'show':
      return { tint: theme.infoSoft, ink: theme.info };
    case 'party':
    case 'festival':
      return { tint: theme.brandSoft, ink: theme.brand };
    case 'exhibition':
      return { tint: theme.warningSoft, ink: theme.warning };
    case 'theatre':
      return { tint: theme.successSoft, ink: theme.success };
    default:
      return { tint: theme.fill, ink: theme.textSecondary };
  }
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "Sam. 15 nov." / "Sat, Nov 15", "Aujourd’hui", "Demain". */
function dayLabel(day: string, lang: Lang, t: Strings, today = todayBh()) {
  if (day === today) return t.bhEvents.today;
  if (day === addDays(today, 1)) return t.bhEvents.tomorrow;
  return capitalize(formatDayDate(day, lang, true));
}

/** When, in one line: "Sam. 15 nov. · 20h30", "Jusqu’au 7 déc.", "Sam. 20 nov. – Dim. 29 nov.", "En cours". */
export function whenLabel(e: BhEvent, lang: Lang, t: Strings, today = todayBh()) {
  const start = bhDay(e.startsAt);
  const end = lastDay(e);
  if (isOngoing(e, today)) {
    if (!e.endsAt) return t.bhEvents.onNow;
    return t.bhEvents.until(formatDayDate(end, lang, true));
  }
  if (end !== start) return `${dayLabel(start, lang, t, today)} – ${formatDayDate(end, lang, true)}`;
  const day = dayLabel(start, lang, t, today);
  return e.timeKnown ? `${day} · ${formatTime(bhTime(e.startsAt), lang)}` : day;
}

/** "Gratuit", "R$ 30", "Dès R$ 15", or null when the source gives no price. */
export function priceLabel(e: BhEvent, lang: Lang, t: Strings) {
  if (e.isFree) return t.bhEvents.free;
  if (e.priceMin == null) return null;
  const min = formatBrl(e.priceMin, lang);
  return e.priceMax != null && e.priceMax > e.priceMin ? t.bhEvents.from(min) : min;
}

function place(e: BhEvent) {
  if (e.venue && e.neighborhood) return `${e.venue}, ${e.neighborhood}`;
  return e.venue ?? e.neighborhood ?? null;
}

/** Only web pages: the link comes from third-party sites (via app-events-sync), never another scheme. */
const isWebUrl = (url: string | null): url is string => !!url && /^https?:\/\/[^\s]+$/i.test(url.trim());

/** Opens the event on its source's website (in-app browser); nothing when the source has no web page. */
export function openEvent(e: BhEvent) {
  const url = e.url?.trim() ?? null;
  if (!isWebUrl(url)) return;
  WebBrowser.openBrowserAsync(url).catch(() => Linking.openURL(url));
}

/* ---------- Photo (fixed size: the box never jumps) ---------- */

function EventPhoto({ e, width, height }: { e: BhEvent; width: number | '100%'; height: number }) {
  const theme = useTheme();
  const { tint, ink } = categoryTint(e.category, theme);
  return (
    <View style={[styles.photo, { width, height, backgroundColor: e.imageUrl ? theme.fill : tint }]}>
      {e.imageUrl ? (
        <Image
          source={{ uri: e.imageUrl }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={200}
          accessibilityIgnoresInvertColors
        />
      ) : (
        <Icon name={CATEGORY_ICONS[e.category]} size={28} color={ink} />
      )}
    </View>
  );
}

/* ---------- Carousel card ---------- */

function EventCard({ e }: { e: BhEvent }) {
  const theme = useTheme();
  const { t, lang } = useI18n();
  const when = whenLabel(e, lang, t);
  const price = priceLabel(e, lang, t);
  const where = place(e);
  const body = (
    <>
      <View>
        <EventPhoto e={e} width={CARD_WIDTH} height={130} />
        <View style={[styles.datePill, { backgroundColor: theme.surface }]}>
          <AppText variant="caption" style={{ fontFamily: Fonts.bodySemi }}>
            {when}
          </AppText>
        </View>
      </View>
      <View style={styles.cardText}>
        <AppText style={{ fontFamily: Fonts.bodySemi }}>{e.title}</AppText>
        {!!where && (
          <AppText variant="caption" color={theme.textSecondary}>
            {where}
          </AppText>
        )}
        <AppText variant="caption" color={theme.textSecondary}>
          {[t.bhEvents.category[e.category], price, e.sourceName].filter(Boolean).join(' · ')}
        </AppText>
      </View>
    </>
  );
  const label = [e.title, when, where, price].filter(Boolean).join(', ');
  return e.url ? (
    <PressableScale accessibilityRole="link" accessibilityLabel={label} onPress={() => openEvent(e)} style={styles.card}>
      {body}
    </PressableScale>
  ) : (
    <View accessible accessibilityLabel={label} style={styles.card}>
      {body}
    </View>
  );
}

/**
 * "Cette semaine à BH": what starts in the next 7 days (then what is already on), as a photo carousel.
 * "Voir tout" opens the full agenda (`/events`).
 */
export function BhEventsSection({ limit = 8, category }: { limit?: number; category?: BhEventCategory }) {
  const theme = useTheme();
  const { t } = useI18n();
  const { state, reload } = useBhEvents();
  const events = state.status === 'ready' ? thisWeek(state.events, category).slice(0, limit) : [];
  // `as Href`: the typed routes list is regenerated by the dev server and /events is new.
  const more = (category ? `/events?category=${category}` : '/events') as Href;

  return (
    <Section
      title={t.bhEvents.sectionTitle}
      subtitle={t.bhEvents.sectionSubtitle}
      action={t.common.seeAll}
      onAction={() => router.push(more)}>
      {state.status === 'loading' ? (
        <LoadingState label={t.common.loading} />
      ) : state.status === 'error' ? (
        <RetryCard message={t.bhEvents.loadError} retryLabel={t.common.retry} onRetry={reload} />
      ) : events.length === 0 ? (
        <Card>
          <AppText color={theme.textSecondary}>{t.bhEvents.emptyWeek}</AppText>
        </Card>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bleed} contentContainerStyle={styles.carousel}>
          {events.map((e) => (
            <EventCard key={e.id} e={e} />
          ))}
        </ScrollView>
      )}
    </Section>
  );
}

/* ---------- Full list ---------- */

function EventRow({ e }: { e: BhEvent }) {
  const theme = useTheme();
  const { t, lang } = useI18n();
  const when = whenLabel(e, lang, t);
  const price = priceLabel(e, lang, t);
  const where = place(e);
  const body = (
    <View style={styles.row}>
      <EventPhoto e={e} width={88} height={88} />
      <View style={{ flex: 1, gap: 2 }}>
        <AppText style={{ fontFamily: Fonts.bodySemi }}>{e.title}</AppText>
        <AppText variant="callout" color={theme.textSecondary}>
          {[when, where].filter(Boolean).join(' · ')}
        </AppText>
        <AppText variant="callout" color={theme.textSecondary}>
          {[t.bhEvents.category[e.category], price].filter(Boolean).join(' · ')}
        </AppText>
        {e.url ? (
          <View style={styles.seeOn}>
            <AppText variant="callout" color={theme.brand} style={{ fontFamily: Fonts.bodySemi, flexShrink: 1 }}>
              {t.bhEvents.seeOn(e.sourceName)}
            </AppText>
            <Icon name="external" size={14} color={theme.brand} />
          </View>
        ) : (
          <AppText variant="caption" color={theme.textTertiary} style={{ marginTop: Spacing.xs }}>
            {t.bhEvents.sourceOnly(e.sourceName)}
          </AppText>
        )}
      </View>
    </View>
  );
  const label = [e.title, when, where, price, e.url ? t.bhEvents.seeOn(e.sourceName) : null].filter(Boolean).join(', ');
  return e.url ? (
    <PressableScale
      accessibilityRole="link"
      accessibilityLabel={label}
      onPress={() => openEvent(e)}
      style={[styles.rowCard, Shadow.card, { backgroundColor: theme.surface }]}>
      {body}
    </PressableScale>
  ) : (
    <View accessible accessibilityLabel={label} style={[styles.rowCard, Shadow.card, { backgroundColor: theme.surface }]}>
      {body}
    </View>
  );
}

type Filter = 'all' | 'weekend' | BhEventCategory;

/**
 * The agenda page: filter chips (all, this weekend, each category that has events), then the events grouped by
 * day, then what is already on, then the sources and a link to the city's official agenda.
 */
export function BhEventsList({
  state,
  onRetry,
  initialCategory,
}: {
  state: ReturnType<typeof useBhEvents>['state'];
  onRetry: () => void;
  initialCategory?: BhEventCategory;
}) {
  const theme = useTheme();
  const { t, lang } = useI18n();
  const [filter, setFilter] = useState<Filter>(initialCategory ?? 'all');

  if (state.status === 'loading') return <LoadingState label={t.common.loading} />;
  if (state.status === 'error') return <RetryCard message={t.bhEvents.loadError} retryLabel={t.common.retry} onRetry={onRetry} />;

  const today = todayBh();
  const present = BH_EVENT_CATEGORIES.filter((c) => state.events.some((e) => e.category === c));
  const shown = state.events.filter((e) =>
    filter === 'all' ? true : filter === 'weekend' ? isThisWeekend(e, today) : e.category === filter,
  );
  const { groups, ongoing } = groupByDay(shown, today);
  const filters: { key: Filter; label: string }[] = [
    { key: 'all', label: t.bhEvents.all },
    { key: 'weekend', label: t.bhEvents.weekend },
    ...present.map((c) => ({ key: c as Filter, label: t.bhEvents.categories[c] })),
  ];

  return (
    <>
      {state.events.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bleed} contentContainerStyle={styles.chips}>
          {filters.map((f) => (
            <Chip key={f.key} label={f.label} selected={filter === f.key} onPress={() => setFilter(f.key)} />
          ))}
        </ScrollView>
      )}

      {shown.length === 0 ? (
        <Card>
          <AppText color={theme.textSecondary}>
            {state.events.length === 0 ? t.bhEvents.empty : t.bhEvents.emptyFilter}
          </AppText>
        </Card>
      ) : (
        <View style={{ gap: Spacing.lg }}>
          {groups.map((g) => (
            <View key={g.day} style={{ gap: Spacing.sm }}>
              <AppText style={{ fontFamily: Fonts.bodySemi }} accessibilityRole="header">
                {dayLabel(g.day, lang, t, today)}
              </AppText>
              {g.events.map((e) => (
                <EventRow key={e.id} e={e} />
              ))}
            </View>
          ))}
        </View>
      )}

      {ongoing.length > 0 && (
        <Section title={t.bhEvents.ongoingTitle} subtitle={t.bhEvents.ongoingSubtitle}>
          <View style={{ gap: Spacing.sm }}>
            {ongoing.map((e) => (
              <EventRow key={e.id} e={e} />
            ))}
          </View>
        </Section>
      )}

      <Card style={{ gap: Spacing.sm }}>
        <AppText variant="callout" color={theme.textSecondary}>
          {t.bhEvents.sourcesNote}
        </AppText>
        <PressableScale
          accessibilityRole="link"
          accessibilityLabel={t.bhEvents.officialAgenda}
          onPress={() => WebBrowser.openBrowserAsync(OFFICIAL_AGENDA_URL).catch(() => Linking.openURL(OFFICIAL_AGENDA_URL))}
          style={styles.officialLink}>
          <Icon name="website" size={18} color={theme.brand} />
          <AppText variant="callout" color={theme.brand} style={{ fontFamily: Fonts.bodySemi, flex: 1 }}>
            {t.bhEvents.officialAgenda}
          </AppText>
          <Icon name="external" size={14} color={theme.brand} />
        </PressableScale>
      </Card>
    </>
  );
}

const CARD_WIDTH = 230;

const styles = StyleSheet.create({
  bleed: { marginHorizontal: -Spacing.gutter },
  carousel: { paddingHorizontal: Spacing.gutter, gap: 12 },
  chips: { paddingHorizontal: Spacing.gutter, gap: Spacing.sm, paddingVertical: 4 },
  card: { width: CARD_WIDTH, gap: 8 },
  cardText: { gap: 1, paddingHorizontal: 2 },
  photo: { borderRadius: 18, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  datePill: {
    position: 'absolute',
    left: 8,
    top: 8,
    maxWidth: CARD_WIDTH - 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.pill,
  },
  rowCard: { borderRadius: Radius.lg, padding: 12 },
  row: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  seeOn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: Spacing.xs, minHeight: 24 },
  officialLink: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, minHeight: TapTarget },
});
