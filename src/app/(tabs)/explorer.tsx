import { Image } from 'expo-image';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useCallback, useEffect, useRef, useState, type ComponentRef } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { AroundMe } from '@/components/around-me';
import { BhEventsSection } from '@/components/bh-events-ui';
import { CharlotteFace } from '@/components/charlotte';
import { GroupTripsEntry } from '@/components/community-ui';
import { BhSights, ExplorerContent, FestivalsCarousel, TripsCarousel } from '@/components/explorer-content';
import { GuideContent } from '@/components/guide-content';
import { TintCard, TintRow, TonightCarousel } from '@/components/home-v3';
import { Icon, type IconName } from '@/components/icon';
import { Carousel, RestaurantPhotoCard } from '@/components/photo-card';
import { PortugueseEntry } from '@/components/portuguese-ui';
import { Screen, Section } from '@/components/screen';
import { TopRatedNearHome } from '@/components/top-rated-near-home';
import { AppText, PressableScale } from '@/components/ui';
import { Fonts, MaxFontScale, Radius, Shadow, Spacing, TapTarget, Type } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { getAttraction } from '@/lib/attractions';
import { MUST_GO } from '@/lib/must-go';
import { restaurants } from '@/lib/restaurants';
import { trackAction } from '@/lib/usage';
import { textParam } from '@/lib/params';

/**
 * Five categories that all fit on the screen (owner, 2026-11-27: "deixa o explore mais simples, tá com muita coisa e
 * pouco intuitivo"; Voyages was the seventh and sat off screen). Culture and Sport went into Sortir.
 */
const CATEGORIES = ['forYou', 'trips', 'out', 'eat', 'practical'] as const;
type Category = (typeof CATEGORIES)[number];
/** Links written before 2026-11-27. */
const MERGED: Record<string, Category> = { culture: 'out', sport: 'out' };

const CATEGORY_ICON: Record<Category, IconName> = {
  forYou: 'heart',
  trips: 'travel',
  out: 'bar',
  eat: 'restaurant',
  practical: 'supermarket',
};

/**
 * Explorer v3 (owner, 2026-11-08): the search on top is also the question to the assistant; categories as in Airbnb.
 * Simpler since 2026-11-27: "Pour vous" opens on the getaways (the trips get the emphasis), then this week in BH, the
 * team's pick and the best rated near home; every topic has one place. The first steps in Brazil moved to Accueil
 * (and stay in Pratique). Links: `/explorer?category=trips`, `?q=…`.
 */
export default function ExplorerScreen() {
  const theme = useTheme();
  const { t, lang } = useI18n();
  // A link can repeat a parameter (it then arrives as a list): only plain text is read.
  const params = useLocalSearchParams<{ category?: string; q?: string }>();
  const asked = textParam(params.category);
  const category: Category = (CATEGORIES as readonly string[]).includes(asked)
    ? (asked as Category)
    : (MERGED[asked] ?? 'forYou');
  const [query, setQuery] = useState(() => textParam(params.q));
  const q = query.trim();
  const e = t.explorerTab;

  // The category bar keeps the active category in view, also when Explorer opens from a link.
  const barRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const barWidth = useRef(0);
  const positions = useRef<Partial<Record<Category, { x: number; w: number }>>>({});
  const showCategory = useCallback((c: Category, animated: boolean) => {
    const p = positions.current[c];
    if (!p) return;
    barRef.current?.scrollTo({ x: Math.max(0, p.x + p.w / 2 - barWidth.current / 2), animated });
  }, []);
  useEffect(() => {
    showCategory(category, true);
  }, [category, showCategory]);

  function ask(question: string) {
    trackAction('explorer_ask');
    router.push({ pathname: '/assistant', params: { q: question } } as Href);
  }

  return (
    <Screen bar="none">
      <View style={{ gap: 14 }}>
        <View style={[styles.search, Shadow.raised, { backgroundColor: theme.surface, borderColor: theme.line }]}>
          <CharlotteFace size={30} />
          <View style={{ flex: 1, justifyContent: 'center' }}>
            {/* The placeholder sits in the flow (the input lies over it), so the pill grows with large text. */}
            {!query && (
              <View pointerEvents="none" style={styles.placeholder}>
                <AppText maxFontSizeMultiplier={MaxFontScale} style={{ fontFamily: Fonts.bodySemi }}>
                  {e.askTitle}
                </AppText>
                <AppText variant="caption" maxFontSizeMultiplier={MaxFontScale} color={theme.textSecondary}>
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
              maxFontSizeMultiplier={MaxFontScale}
              style={[Type.body, styles.input, !query && StyleSheet.absoluteFill, { color: theme.text }]}
            />
          </View>
          {!!query && (
            <PressableScale accessibilityRole="button" accessibilityLabel={e.clear} hitSlop={10} onPress={() => setQuery('')}>
              <Icon name="close" size={18} color={theme.textSecondary} />
            </PressableScale>
          )}
        </View>

        {/* No ready-made questions under the search (owner, 2026-11-27: "tirar essas sugestões"). */}
        {!q && (
          <ScrollView
            ref={barRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            onLayout={(ev) => {
              barWidth.current = ev.nativeEvent.layout.width;
            }}
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
                  onLayout={(ev) => {
                    const { x, width } = ev.nativeEvent.layout;
                    positions.current[c] = { x, w: width };
                    if (active) showCategory(c, false);
                  }}
                  style={[styles.category, { borderBottomColor: active ? theme.text : 'transparent' }]}>
                  <Icon name={CATEGORY_ICON[c]} size={23} color={color} active={active} />
                  <AppText
                    variant="caption"
                    color={color}
                    maxFontSizeMultiplier={MaxFontScale}
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
  const theme = useTheme();
  const { t } = useI18n();
  const e = t.explorerTab;
  switch (category) {
    case 'forYou':
      return (
        <>
          <TripsCarousel onSeeAll={() => router.setParams({ category: 'trips' })} />
          <GroupTripsEntry />
          <BhEventsSection limit={8} />
          <TeamPick />
          <TopRatedNearHome />
        </>
      );
    case 'trips':
      return (
        <>
          <GroupTripsEntry />
          <ExplorerContent segments={['mg', 'br', 'sa']} />
        </>
      );
    case 'out':
      // Events, bars, what to see in BH, festivals and sport: Culture and Sport were their own categories. One row
      // each, the full lists one tap away.
      return (
        <>
          <BhEventsSection limit={10} />
          <Section title={e.bars} subtitle={e.barsHint} action={e.seeAll} onAction={() => router.push('/nightlife')}>
            <TonightCarousel />
          </Section>
          <BhSights />
          <FestivalsCarousel />
          <GuideContent query="" only={['sport']} />
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
          <TintCard>
            <TintRow
              first
              icon="restaurant"
              tint={theme.warningSoft}
              ink={theme.warning}
              title={t.dishes.entry}
              subtitle={t.guide.dishesStatus}
              onPress={() => router.push('/restaurants/dishes')}
            />
          </TintCard>
        </>
      );
    case 'practical':
      // One list for what is useful, the circles near home, then Google Maps wherever the student is.
      return (
        <>
          <GuideContent query="" only={['around']} />
          <Section title={e.essentials}>
            <TintCard>
              <TintRow
                first
                icon="apps"
                tint={theme.brandSoft}
                ink={theme.brand}
                title={e.firstSteps}
                subtitle={e.firstStepsHint}
                onPress={() => router.push('/first-steps' as Href)}
              />
              <PortugueseEntry variant="row" first={false} />
              <TintRow
                icon="emergency"
                tint={theme.successSoft}
                ink={theme.success}
                title={t.health.entry}
                subtitle={t.health.entryHint}
                onPress={() => router.push('/health' as Href)}
              />
              <TintRow
                icon="phoneOff"
                tint={theme.brandSoft}
                ink={theme.brand}
                title={t.phoneStolen.entry}
                subtitle={t.phoneStolen.entryHint}
                onPress={() => router.push('/phone-stolen' as Href)}
              />
            </TintCard>
          </Section>
          <AroundMe />
        </>
      );
  }
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
  placeholder: { paddingVertical: 8 },
  input: { minHeight: TapTarget, paddingVertical: 0 },
  bleed: { marginHorizontal: -Spacing.gutter },
  chips: { paddingHorizontal: Spacing.gutter, gap: Spacing.sm },
  categories: { paddingHorizontal: Spacing.gutter, gap: 22 },
  category: { alignItems: 'center', gap: 5, paddingTop: 4, paddingBottom: 10, borderBottomWidth: 2, minWidth: TapTarget },
  askRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: Radius.lg },
  pickPhoto: { width: '100%', aspectRatio: 16 / 9, borderRadius: Radius.lg },
  pickBadge: { position: 'absolute', top: 12, left: 12, paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.pill },
});
