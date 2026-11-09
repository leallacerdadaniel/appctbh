import { Image } from 'expo-image';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { AroundMe } from '@/components/around-me';
import { BhEventsSection } from '@/components/bh-events-ui';
import { CharlotteFace } from '@/components/charlotte';
import { GroupTripsEntry } from '@/components/community-ui';
import { ExplorerContent } from '@/components/explorer-content';
import { GuideContent } from '@/components/guide-content';
import { HealthEntry } from '@/components/health-ui';
import { TonightCarousel } from '@/components/home-v3';
import { Icon, type IconName } from '@/components/icon';
import { Carousel, RestaurantPhotoCard } from '@/components/photo-card';
import { PhoneStolenEntry } from '@/components/phone-stolen-ui';
import { PhraseOfTheDay, PortugueseEntry } from '@/components/portuguese-ui';
import { Screen, Section } from '@/components/screen';
import { TopRatedNearHome } from '@/components/top-rated-near-home';
import { AppText, PressableScale } from '@/components/ui';
import { Fonts, Radius, Shadow, Spacing, TapTarget, Type } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { attractions, getAttraction } from '@/lib/attractions';
import { MUST_GO } from '@/lib/must-go';
import { nightPlaces } from '@/lib/nightlife';
import { usePlaces } from '@/lib/places';
import { restaurants } from '@/lib/restaurants';
import { getService } from '@/lib/services';
import { trackAction } from '@/lib/usage';

const CATEGORIES = ['forYou', 'out', 'eat', 'sport', 'culture', 'trips', 'practical'] as const;
type Category = (typeof CATEGORIES)[number];

const CATEGORY_ICON: Record<Category, IconName> = {
  forYou: 'heart',
  out: 'bar',
  eat: 'restaurant',
  sport: 'sport',
  culture: 'culture',
  trips: 'travel',
  practical: 'supermarket',
};

/** Walking distance that still counts as "à pied de chez vous". */
const NEAR_MIN = 15;

/**
 * Explorer v3 (owner, 2026-11-08): the search on top is also the question to the assistant; categories
 * as in Airbnb; "Pour vous" opens with the first steps in Brazil, the team's pick and what is a walk away.
 * The other categories reuse the Guide and Explorer content. Links: `/explorer?category=trips`, `?q=…`.
 */
export default function ExplorerScreen() {
  const theme = useTheme();
  const { t, lang } = useI18n();
  const params = useLocalSearchParams<{ category?: string; q?: string }>();
  const category: Category = (CATEGORIES as readonly string[]).includes(params.category ?? '')
    ? (params.category as Category)
    : 'forYou';
  const [query, setQuery] = useState(params.q ?? '');
  const q = query.trim();
  const e = t.explorerTab;

  function ask(question: string) {
    trackAction('explorer_ask');
    router.push({ pathname: '/assistant', params: { q: question } } as Href);
  }

  return (
    <Screen bar="none">
      <View style={{ gap: 14 }}>
        <View style={[styles.search, Shadow.raised, { backgroundColor: theme.surface, borderColor: theme.line }]}>
          <CharlotteFace size={30} />
          <View style={{ flex: 1 }}>
            {!query && (
              <View pointerEvents="none" style={styles.placeholder}>
                <AppText style={{ fontFamily: Fonts.bodySemi }}>{e.askTitle}</AppText>
                <AppText variant="caption" color={theme.textSecondary}>
                  {e.askHint}
                </AppText>
              </View>
            )}
            <TextInput
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={() => q && ask(q)}
              returnKeyType="search"
              accessibilityLabel={e.askTitle}
              placeholderTextColor={theme.textTertiary}
              style={[Type.body, styles.input, { color: theme.text }]}
            />
          </View>
          {!!query && (
            <PressableScale accessibilityRole="button" accessibilityLabel={e.clear} hitSlop={10} onPress={() => setQuery('')}>
              <Icon name="close" size={18} color={theme.textSecondary} />
            </PressableScale>
          )}
        </View>

        {!q && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bleed} contentContainerStyle={styles.chips}>
            {e.suggestions.map((s) => (
              <PressableScale
                key={s}
                accessibilityRole="button"
                onPress={() => ask(s)}
                style={[styles.chip, { borderColor: theme.line, backgroundColor: theme.surface }]}>
                <AppText variant="callout">{s}</AppText>
              </PressableScale>
            ))}
          </ScrollView>
        )}

        {!q && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={[styles.bleed, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.line }]}
            contentContainerStyle={styles.categories}
            role="tablist">
            {CATEGORIES.map((c) => {
              const active = c === category;
              const color = active ? theme.text : theme.textSecondary;
              return (
                <PressableScale
                  key={c}
                  role="tab"
                  aria-selected={active}
                  accessibilityLabel={e.categories[c]}
                  onPress={() => {
                    trackAction('explorer_category', c);
                    router.setParams({ category: c });
                  }}
                  style={[styles.category, { borderBottomColor: active ? theme.text : 'transparent' }]}>
                  <Icon name={CATEGORY_ICON[c]} size={23} color={color} active={active} />
                  <AppText
                    variant="caption"
                    color={color}
                    style={{ fontFamily: active ? Fonts.bodySemi : Fonts.body }}>
                    {e.categories[c]}
                  </AppText>
                </PressableScale>
              );
            })}
          </ScrollView>
        )}
      </View>

      {q ? (
        <>
          <PressableScale
            accessibilityRole="button"
            onPress={() => ask(q)}
            style={[styles.askRow, { backgroundColor: theme.brandSoft }]}>
            <CharlotteFace size={28} />
            <View style={{ flex: 1, gap: 1 }}>
              <AppText style={{ fontFamily: Fonts.bodySemi }}>{e.askAssistant}</AppText>
              <AppText variant="caption" color={theme.textSecondary}>
                {lang === 'fr' ? `« ${q} »` : `“${q}”`}
              </AppText>
            </View>
            <Icon name="chevronRight" size={15} color={theme.brand} />
          </PressableScale>
          <GuideContent query={query} />
        </>
      ) : (
        <CategoryContent category={category} />
      )}
    </Screen>
  );
}

function CategoryContent({ category }: { category: Category }) {
  const { t } = useI18n();
  const e = t.explorerTab;
  switch (category) {
    case 'forYou':
      return (
        <>
          <FirstStepsBanner />
          <BhEventsSection limit={8} />
          <TeamPick />
          <PhraseOfTheDay />
          <NearHome />
          <TopRatedNearHome />
          <AroundMe />
        </>
      );
    case 'out':
      return (
        <>
          <BhEventsSection limit={10} />
          <Section title={e.bars} subtitle={e.barsHint} action={e.seeAll} onAction={() => router.push('/nightlife')}>
            <TonightCarousel />
          </Section>
          <TopRatedNearHome only={['bar']} />
          <ExplorerContent segments={['events']} />
        </>
      );
    case 'eat':
      return (
        <>
          <Section
            title={e.restaurants}
            subtitle={e.restaurantsHint}
            action={e.seeAll}
            onAction={() => router.push('/restaurants')}>
            <Carousel>
              {[...restaurants]
                .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
                .slice(0, 8)
                .map((r) => (
                  <RestaurantPhotoCard key={r.id} restaurant={r} />
                ))}
            </Carousel>
          </Section>
          <TopRatedNearHome only={['restaurant', 'cafe']} />
          <GuideContent query="" only={['eat']} />
        </>
      );
    case 'sport':
      return <GuideContent query="" only={['sport']} />;
    case 'culture':
      return <ExplorerContent segments={['bh']} />;
    case 'trips':
      return (
        <>
          <GroupTripsEntry />
          <AroundMe />
          <ExplorerContent segments={['mg', 'br', 'sa']} />
        </>
      );
    case 'practical':
      return (
        <>
          <PortugueseEntry />
          <PhoneStolenEntry />
          <HealthEntry />
          <GuideContent query="" only={['around', 'start', 'daily']} />
        </>
      );
  }
}

/** "Premiers pas au Brésil": apps, CPF and bank, in order (also step 3 of the arrival checklist). */
function FirstStepsBanner() {
  const theme = useTheme();
  const { t } = useI18n();
  const logos = ['uber', 'ifood', 'nubank'].map((id) => getService(id)?.logo).filter((l): l is number => l != null);
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={t.explorerTab.firstSteps}
      onPress={() => router.push('/first-steps' as Href)}
      style={[styles.banner, { backgroundColor: theme.brandSoft }]}>
      <View style={{ flexDirection: 'row' }}>
        {logos.map((logo, i) => (
          <Image
            key={i}
            source={logo}
            style={[styles.bannerLogo, { marginLeft: i ? -6 : 0, borderColor: theme.brandSoft }]}
            contentFit="cover"
            accessible={false}
          />
        ))}
      </View>
      <View style={{ flex: 1, gap: 1 }}>
        <AppText style={{ fontFamily: Fonts.bodySemi }}>{t.explorerTab.firstSteps}</AppText>
        <AppText variant="caption" color={theme.textSecondary}>
          {t.explorerTab.firstStepsHint}
        </AppText>
      </View>
      <Icon name="chevronRight" size={16} color={theme.brand} />
    </PressableScale>
  );
}

/** One of the team's must-go places in BH, a different one each week. */
function TeamPick() {
  const theme = useTheme();
  const { t, lang } = useI18n();
  const [week] = useState(() => Math.floor(Date.now() / (7 * 86_400_000)));
  const picks = MUST_GO.bh.map(getAttraction).filter((a) => a?.photo != null);
  const a = picks[week % Math.max(picks.length, 1)];
  if (!a) return null;
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${t.explorerTab.pick}: ${a.name}`}
      onPress={() => router.push({ pathname: '/attraction/[id]', params: { id: a.id } })}
      style={{ gap: 10 }}>
      <View>
        <Image source={a.photo} style={[styles.pickPhoto, { backgroundColor: theme.fill }]} contentFit="cover" />
        <View style={[styles.pickBadge, { backgroundColor: theme.surface }]}>
          <AppText variant="caption" style={{ fontFamily: Fonts.bodySemi }}>
            {t.explorerTab.pick}
          </AppText>
        </View>
      </View>
      <View style={{ gap: 2, paddingHorizontal: 2 }}>
        <AppText style={{ fontFamily: Fonts.bodySemi }}>{a.name}</AppText>
        <AppText variant="callout" color={theme.textSecondary}>
          {[t.explore.groups[a.group], a.duration[lang]].join(' · ')}
        </AppText>
      </View>
    </PressableScale>
  );
}

/** Bars and sights with a photo, at most 15 minutes on foot, closest first. */
function NearHome() {
  const theme = useTheme();
  const { t, lang } = useI18n();
  const times = usePlaces()?.times;
  const items = [
    ...nightPlaces
      .filter((p) => p.photo != null)
      .map((p) => ({
        id: `n-${p.id}`,
        name: p.name,
        kind: p.vibe[lang],
        photo: p.photo as number,
        walk: times?.[p.placeId]?.walkMin,
        href: { pathname: '/nightlife/[id]', params: { id: p.id } } as Href,
      })),
    ...attractions
      .filter((a) => a.photo != null)
      .map((a) => ({
        id: `a-${a.id}`,
        name: a.name,
        kind: t.explore.groups[a.group],
        photo: a.photo as number,
        walk: times?.[a.placeId]?.walkMin,
        href: { pathname: '/attraction/[id]', params: { id: a.id } } as Href,
      })),
  ]
    .filter((x) => x.walk != null && x.walk <= NEAR_MIN)
    .sort((x, y) => (x.walk ?? 0) - (y.walk ?? 0))
    .slice(0, 8);

  // Walking times not known yet (new apartment, or offline): the bars instead, without distances.
  if (items.length === 0)
    return (
      <Section title={t.explorerTab.bars} subtitle={t.explorerTab.barsHint}>
        <TonightCarousel />
      </Section>
    );
  return (
    <Section title={t.explorerTab.nearHome}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bleed} contentContainerStyle={styles.chips}>
        {items.map((x) => (
          <PressableScale key={x.id} accessibilityRole="button" onPress={() => router.push(x.href)} style={styles.nearCard}>
            <Image source={x.photo} style={[styles.nearPhoto, { backgroundColor: theme.fill }]} contentFit="cover" />
            <AppText style={{ fontFamily: Fonts.bodySemi }}>{x.name}</AppText>
            <AppText variant="caption" color={theme.textSecondary}>
              {[x.kind, t.today.walk(x.walk!)].join(' · ')}
            </AppText>
          </PressableScale>
        ))}
      </ScrollView>
    </Section>
  );
}

const styles = StyleSheet.create({
  search: {
    minHeight: 58,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
  },
  placeholder: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, justifyContent: 'center' },
  input: { minHeight: TapTarget, paddingVertical: 0 },
  bleed: { marginHorizontal: -Spacing.gutter },
  chips: { paddingHorizontal: Spacing.gutter, gap: Spacing.sm },
  chip: {
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
  },
  categories: { paddingHorizontal: Spacing.gutter, gap: 22 },
  category: { alignItems: 'center', gap: 5, paddingTop: 4, paddingBottom: 10, borderBottomWidth: 2, minWidth: TapTarget },
  askRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: Radius.lg },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: Radius.lg },
  bannerLogo: { width: 28, height: 28, borderRadius: 8, borderWidth: 2 },
  pickPhoto: { width: '100%', aspectRatio: 16 / 9, borderRadius: Radius.lg },
  pickBadge: { position: 'absolute', top: 12, left: 12, paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.pill },
  nearCard: { width: 150, gap: 4 },
  nearPhoto: { width: 150, height: 100, borderRadius: 16, marginBottom: 4 },
});
