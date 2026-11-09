import { Link, router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { MustGoBadge } from '@/components/must-go-badge';
import { Carousel } from '@/components/photo-card';
import { PlacePhoto } from '@/components/place-photo';
import { SegmentedControl } from '@/components/segmented-control';
import { Section } from '@/components/screen';
import { AppText, Chip, PressableScale } from '@/components/ui';
import { Fonts, Radius, Shadow, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { ATTRACTION_GROUPS, attractions, getAttraction, type Attraction } from '@/lib/attractions';
import { festivals, getFestival, type FestivalItem } from '@/lib/festivals';
import { MUST_GO } from '@/lib/must-go';
import { WALK_LIMIT_MIN } from '@/lib/nearby';
import { useTimes } from '@/lib/places';
import { trackAction } from '@/lib/usage';
import {
  destinations,
  getDestination,
  placeLabel,
  transportIcon,
  type DestinationWithPhoto,
  type Region,
  type TripType,
} from '@/lib/travel';

export type ExplorerSegment = 'bh' | Region | 'events';
type Segment = ExplorerSegment;
const SEGMENTS: Segment[] = ['bh', 'mg', 'br', 'sa', 'events'];
const TRIPS: TripType[] = ['daytrip', 'weekend', 'long', 'holiday'];

/**
 * BH attractions, Minas escapes, trips across Brazil and South America, events and festivals.
 * v3 (2026-11-08): the Explorer tab's categories show a subset (`segments`): Culture = BH, Voyages = the
 * three regions, Sortir = events. The segmented control only shows with more than one segment.
 */
export function ExplorerContent({ segments = SEGMENTS }: { segments?: Segment[] }) {
  const { t } = useI18n();
  const [segment, setSegment] = useState<Segment>(segments[0]);

  return (
    <>
      {segments.length > 1 && (
        <SegmentedControl
          options={segments.map((x) => ({ value: x, label: t.explore.segments[x] }))}
          value={segment}
          onChange={(next) => {
            trackAction('explorer_tab', next);
            setSegment(next);
          }}
        />
      )}
      {segment === 'bh' ? <BhAttractions /> : segment === 'events' ? <Events /> : <Trips region={segment} />}
    </>
  );
}

/* ---------- BH ---------- */

function BhAttractions() {
  const { t } = useI18n();
  const mustGo = MUST_GO.bh.map(getAttraction).filter((a): a is Attraction => !!a);
  return (
    <>
      {mustGo.length > 0 && (
        <Section title={t.explore.mustGoTitle} subtitle={t.explore.mustGoHint}>
          <Carousel>
            {mustGo.map((a) => (
              <AttractionCard key={a.id} attraction={a} />
            ))}
          </Carousel>
        </Section>
      )}
      {ATTRACTION_GROUPS.map((g) => (
        <Section key={g} title={t.explore.groups[g]} subtitle={t.explore.groupHints[g]}>
          <Carousel>
            {attractions
              .filter((a) => a.group === g)
              .map((a) => (
                <AttractionCard key={a.id} attraction={a} />
              ))}
          </Carousel>
        </Section>
      ))}
    </>
  );
}

function AttractionCard({ attraction: raw }: { attraction: Attraction }) {
  const a = useTimes(raw);
  const theme = useTheme();
  const { t } = useI18n();
  const far = a.walkMin != null && a.walkMin > WALK_LIMIT_MIN;
  const distance =
    a.walkMin == null ? null : far && a.driveMin != null ? t.explore.drive(a.driveMin) : t.explore.walk(a.walkMin);

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={a.name}
      onPress={() => router.push({ pathname: '/attraction/[id]', params: { id: a.id } })}
      style={[styles.card, Shadow.card, { backgroundColor: theme.surface }]}>
      <View>
        <PlacePhoto
          placeId={a.placeId}
          source={a.photo}
          photoIndex={a.photoIndex}
          width={500}
          radius={0}
          credit="overlay"
        />
        <View style={styles.badges}>
          {a.mustGo && <MustGoBadge />}
          {a.price === 'free' && (
            <View style={[styles.pill, { backgroundColor: theme.scrim }]}>
              <AppText variant="caption" color={theme.onBrand}>
                {t.explore.price.free}
              </AppText>
            </View>
          )}
        </View>
      </View>
      <View style={styles.body}>
        <AppText style={{ fontFamily: Fonts.bodyMedium }}>{a.name}</AppText>
        <AppText variant="callout" color={theme.textSecondary}>
          {a.neighborhood}
        </AppText>
        {distance && (
          <View style={styles.meta}>
            <Icon name={far ? 'car' : 'walk'} size={13} color={theme.textSecondary} />
            <AppText variant="caption" color={theme.textSecondary} style={{ flex: 1 }}>
              {distance}
            </AppText>
          </View>
        )}
      </View>
    </PressableScale>
  );
}

/* ---------- Events ---------- */

function Events() {
  const theme = useTheme();
  const { t } = useI18n();
  const mustGo = MUST_GO.events.map(getFestival).filter((e): e is FestivalItem => !!e);
  return (
    <>
      <AppText variant="callout" color={theme.textSecondary}>
        {t.explore.eventsHint}
      </AppText>
      {mustGo.length > 0 && (
        <Section title={t.explore.mustGoTitle} subtitle={t.explore.mustGoHint}>
          <Carousel>
            {mustGo.map((e) => (
              <EventTile key={e.id} event={e} />
            ))}
          </Carousel>
        </Section>
      )}
      <View style={{ gap: Spacing.lg }}>
        {festivals.map((e) => (
          <EventCard key={e.id} event={e} />
        ))}
      </View>
      <AppText variant="caption" color={theme.textSecondary} style={{ textAlign: 'center' }}>
        {t.explore.eventsDisclaimer}
      </AppText>
    </>
  );
}

/** Carousel tile for a must-go event. */
function EventTile({ event: e }: { event: FestivalItem }) {
  const theme = useTheme();
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={e.name}
      onPress={() => router.push({ pathname: '/festival/[id]', params: { id: e.id } })}
      style={[styles.card, Shadow.card, { backgroundColor: theme.surface }]}>
      <View>
        <PlacePhoto
          placeId={e.placeId}
          source={e.photo}
          photoIndex={e.photoIndex}
          width={500}
          radius={0}
          credit="overlay"
        />
        <View style={styles.badges}>
          <MustGoBadge />
        </View>
      </View>
      <View style={styles.body}>
        <AppText style={{ fontFamily: Fonts.bodyMedium }}>{e.name}</AppText>
        <AppText variant="callout" color={theme.textSecondary}>
          {e.city}
        </AppText>
      </View>
    </PressableScale>
  );
}

/** Full-width photo card for an event, with the usual period. */
function EventCard({ event: e }: { event: FestivalItem }) {
  const theme = useTheme();
  const { lang } = useI18n();
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${e.name}, ${e.city}`}
      onPress={() => router.push({ pathname: '/festival/[id]', params: { id: e.id } })}
      style={[styles.wideCard, Shadow.card, { backgroundColor: theme.surface }]}>
      <View>
        <PlacePhoto
          placeId={e.placeId}
          source={e.photo}
          photoIndex={e.photoIndex}
          width={900}
          aspectRatio={16 / 9}
          radius={0}
          credit="overlay"
        />
        <View style={styles.badges}>{e.mustGo && <MustGoBadge />}</View>
      </View>
      <View style={styles.eventBody}>
        <AppText style={{ fontFamily: Fonts.bodyMedium }}>{e.name}</AppText>
        <AppText variant="callout" color={theme.textSecondary}>
          {e.city}
        </AppText>
        <View style={styles.meta}>
          <Icon name="calendar" size={13} color={theme.textSecondary} />
          <AppText variant="caption" color={theme.textSecondary} style={{ flex: 1 }}>
            {e.when[lang]}
          </AppText>
        </View>
      </View>
    </PressableScale>
  );
}

/* ---------- Minas / Brazil ---------- */

function Trips({ region }: { region: Region }) {
  const theme = useTheme();
  const { t } = useI18n();
  const [trip, setTrip] = useState<TripType | null>(null);

  const inRegion = destinations.filter((d) => d.region === region);
  const available = TRIPS.filter((x) => inRegion.some((d) => d.trip === x));
  const shown = trip ? inRegion.filter((d) => d.trip === trip) : inRegion;
  const mustGo = MUST_GO[region].map(getDestination).filter((d): d is DestinationWithPhoto => !!d);

  return (
    <>
      <View style={{ gap: Spacing.md }}>
        <AppText variant="callout" color={theme.textSecondary}>
          {region === 'mg' ? t.explore.minasHint : region === 'br' ? t.explore.brazilHint : t.explore.southAmericaHint}
        </AppText>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.bleed}
          contentContainerStyle={styles.chips}>
          <Chip label={t.travel.all} selected={trip === null} onPress={() => setTrip(null)} />
          {available.map((x) => (
            <Chip
              key={x}
              label={t.travel.trips[x]}
              selected={trip === x}
              onPress={() => setTrip(trip === x ? null : x)}
            />
          ))}
        </ScrollView>
      </View>

      {mustGo.length > 0 && !trip && (
        <Section title={t.explore.mustGoTitle} subtitle={t.explore.mustGoHint}>
          <Carousel>
            {mustGo.map((d) => (
              <DestinationTile key={d.id} destination={d} />
            ))}
          </Carousel>
        </Section>
      )}

      <View style={{ gap: Spacing.lg }}>
        {shown.map((d) => (
          <DestinationCard key={d.id} destination={d} />
        ))}
      </View>

      <AppText variant="caption" color={theme.textSecondary} style={{ textAlign: 'center' }}>
        {t.travel.disclaimer}
      </AppText>
    </>
  );
}

/** Carousel tile for a must-go destination. */
function DestinationTile({ destination: d }: { destination: DestinationWithPhoto }) {
  const theme = useTheme();
  const { lang } = useI18n();
  return (
    // Zoom into the destination page (iOS 18+ native zoom transition, trial of 2026-11-09); a plain push elsewhere.
    // Link asChild passes the press to PressableScale; the style must be flat for Link's Slot.
    <Link href={{ pathname: '/travel/[id]', params: { id: d.id } }} asChild>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={`${d.name}, ${placeLabel(d, lang)}`}
        style={StyleSheet.flatten([styles.card, Shadow.card, { backgroundColor: theme.surface }])}>
        <Link.AppleZoom>
          <View>
            <PlacePhoto
              placeId={d.placeId}
              source={d.photo}
              photoIndex={d.photoIndex}
              width={500}
              radius={0}
              credit="overlay"
            />
            <View style={styles.badges}>
              <MustGoBadge />
            </View>
          </View>
        </Link.AppleZoom>
        <View style={styles.body}>
          <AppText style={{ fontFamily: Fonts.bodyMedium }}>{d.name}</AppText>
          <AppText variant="callout" color={theme.textSecondary}>
            {placeLabel(d, lang)}
          </AppText>
          <View style={styles.meta}>
            <Icon name={transportIcon(d)} size={13} color={theme.textSecondary} />
            <AppText variant="caption" color={theme.textSecondary} style={{ flex: 1 }}>
              {d.fromBh[lang]}
            </AppText>
          </View>
        </View>
      </PressableScale>
    </Link>
  );
}

/** Full-width photo card for a destination. */
function DestinationCard({ destination: d }: { destination: DestinationWithPhoto }) {
  const theme = useTheme();
  const { t, lang } = useI18n();
  return (
    <Link href={{ pathname: '/travel/[id]', params: { id: d.id } }} asChild>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={`${d.name}, ${placeLabel(d, lang)}`}
        style={StyleSheet.flatten([styles.wideCard, Shadow.card, { backgroundColor: theme.surface }])}>
        <Link.AppleZoom>
          <View>
            <PlacePhoto
              placeId={d.placeId}
              source={d.photo}
              photoIndex={d.photoIndex}
              width={900}
              aspectRatio={16 / 9}
              radius={0}
              credit="overlay"
            />
            <View style={styles.badges}>
              {d.mustGo && <MustGoBadge />}
              <View style={[styles.pill, { backgroundColor: theme.scrim }]}>
                <AppText variant="caption" color={theme.onBrand}>
                  {t.travel.trips[d.trip]}
                </AppText>
              </View>
            </View>
          </View>
        </Link.AppleZoom>
        <View style={styles.wideBody}>
          <View style={{ flex: 1, gap: 2 }}>
            <AppText style={{ fontFamily: Fonts.bodyMedium }}>{d.name}</AppText>
            <AppText variant="callout" color={theme.textSecondary}>
              {placeLabel(d, lang)}
            </AppText>
          </View>
          <View style={styles.metaRight}>
            <Icon name={transportIcon(d)} size={13} color={theme.textSecondary} />
            <AppText variant="caption" color={theme.textSecondary} style={{ textAlign: 'right', flexShrink: 1 }}>
              {d.fromBh[lang]}
            </AppText>
          </View>
        </View>
      </PressableScale>
    </Link>
  );
}

const styles = StyleSheet.create({
  bleed: { marginHorizontal: -Spacing.gutter },
  chips: { gap: Spacing.sm, paddingHorizontal: Spacing.gutter },
  card: { width: 220, borderRadius: Radius.lg, overflow: 'hidden' },
  badges: { position: 'absolute', top: 8, left: 8, right: 8, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.pill },
  body: { padding: 12, gap: 2 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  wideCard: { borderRadius: Radius.lg, overflow: 'hidden' },
  eventBody: { padding: 14, gap: 2 },
  wideBody: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: 14 },
  metaRight: { flexDirection: 'row', alignItems: 'center', gap: 4, maxWidth: '50%' },
});
