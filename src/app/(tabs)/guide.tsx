import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useRef, useState, type ComponentRef } from 'react';
import { Linking, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';

import { HubGrid, HubTile } from '@/components/hub-tile';
import { Icon } from '@/components/icon';
import { ListGroup, ListRow } from '@/components/list';
import { Screen, Section } from '@/components/screen';
import { normalize, SearchField } from '@/components/search-field';
import { AppText, Button, Card, PressableScale } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n, type Lang } from '@/i18n';
import { adminProcedures } from '@/lib/admin';
import { attractions } from '@/lib/attractions';
import { beautyPlaces } from '@/lib/beauty';
import { dishes } from '@/lib/dishes';
import { contacts, guide, type GuideItem } from '@/lib/mock-data';
import { nightPlaces } from '@/lib/nightlife';
import { services } from '@/lib/services';
import { sportPlaces } from '@/lib/sports';
import { displayName, restaurants } from '@/lib/restaurants';

/**
 * "Guide": everything for living in BH — eating (restaurants, dishes), going out at night, sport, everyday needs
 * (nearby places, emergencies) and the practical info. Exploring and travel live in Explorer.
 */
export default function GuideScreen() {
  const theme = useTheme();
  const { t, lang } = useI18n();
  const params = useLocalSearchParams<{ focus?: string; q?: string }>();
  const inputRef = useRef<ComponentRef<typeof TextInput>>(null);
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);

  // Arriving from the Home search bar or a shortcut (e.g. "Urgences").
  useFocusEffect(
    useCallback(() => {
      if (params.q) setQuery(params.q);
      if (params.focus) setTimeout(() => inputRef.current?.focus(), 250);
    }, [params.q, params.focus]),
  );

  const q = normalize(query.trim());

  // One search over everything the Guide covers; both languages so "ménage" works in EN mode.
  const results = useMemo(() => {
    if (!q) return null;
    const has = (parts: string[]) => normalize(parts.join(' ')).includes(q);
    return {
      info: guide.filter((g) =>
        has([...Object.values(g.title), ...Object.values(g.category), g.body[lang], ...g.keywords]),
      ),
      restaurants: restaurants.filter((r) => has([r.name, ...Object.values(r.cuisine), r.neighborhood])),
      places: attractions.filter((a) => has([a.name, a.neighborhood])),
      dishes: dishes.filter((d) => has([d.name, ...Object.values(d.description)])),
      night: nightPlaces.filter((p) => has([p.name, ...Object.values(p.vibe), p.neighborhood])),
      sport: sportPlaces.filter((p) =>
        has([p.name, ...Object.values(p.kind), p.neighborhood, ...p.groups.flatMap((g) => [t.sports.groups[g]])]),
      ),
      services: services.filter((s) => has([s.name, ...Object.values(s.kind), t.services.groups[s.group]])),
      admin: adminProcedures.filter((p) =>
        has([p.title, ...Object.values(p.kind), ...Object.values(p.summary), ...p.keywords]),
      ),
      beauty: beautyPlaces.filter((p) =>
        has([p.name, ...Object.values(p.kind), ...Object.values(p.description), ...p.neighborhoods, t.beauty.groups[p.group]]),
      ),
    };
  }, [q, lang, t]);

  const empty =
    results &&
    !results.info.length &&
    !results.restaurants.length &&
    !results.places.length &&
    !results.dishes.length &&
    !results.night.length &&
    !results.sport.length &&
    !results.services.length &&
    !results.beauty.length &&
    !results.admin.length;

  return (
    <Screen title={t.guide.title} subtitle={t.guide.subtitle}>
      <SearchField
        ref={inputRef}
        value={query}
        onChangeText={setQuery}
        placeholder={t.guide.searchPlaceholder}
        clearLabel={t.guide.clear}
      />

      {!results && (
        <>
          <Section title={t.guide.start} subtitle={t.guide.startHint}>
            <HubGrid>
              <HubTile
                emoji="🛂"
                title={t.admin.title}
                status={t.admin.status}
                onPress={() => router.push('/admin')}
              />
              <HubTile
                emoji="📱"
                title={t.services.title}
                status={t.services.status}
                onPress={() => router.push('/services')}
              />
            </HubGrid>
          </Section>

          <Section title={t.guide.daily} subtitle={t.guide.dailyHint}>
            <HubGrid>
              <HubTile
                emoji="🛒"
                title={t.nearby.title}
                status={t.guide.nearbyStatus}
                onPress={() => router.push('/nearby')}
              />
              <HubTile
                emoji="🚑"
                title={t.home.emergency}
                status={t.guide.emergencyStatus}
                onPress={() => router.push('/emergency')}
              />
            </HubGrid>
          </Section>

          <Section title={t.guide.eat} subtitle={t.guide.eatHint}>
            <HubGrid>
              <HubTile
                emoji="🍽️"
                title={t.restaurants.title}
                status={t.guide.restaurantsStatus(restaurants.length)}
                onPress={() => router.push('/restaurants')}
              />
              <HubTile
                emoji="🧀"
                title={t.dishes.entry}
                status={t.guide.dishesStatus}
                onPress={() => router.push('/restaurants/dishes')}
              />
              <HubTile
                emoji="🌙"
                title={t.nightlife.title}
                status={t.nightlife.status}
                onPress={() => router.push('/nightlife')}
              />
            </HubGrid>
          </Section>

          <Section title={t.guide.sport} subtitle={t.guide.sportHint}>
            <HubGrid>
              <HubTile
                emoji="🏃"
                title={t.sports.title}
                status={t.sports.status}
                onPress={() => router.push('/sports')}
              />
              <HubTile
                emoji="💇"
                title={t.beauty.title}
                status={t.beauty.status}
                onPress={() => router.push('/beauty')}
              />
            </HubGrid>
          </Section>
        </>
      )}

      {results && !empty && (
        <>
          {results.info.length > 0 && (
            <Section title={t.guide.info}>
              <InfoList
                items={results.info}
                lang={lang}
                // A single match (e.g. from the "Urgences" shortcut) opens directly.
                openId={results.info.length === 1 ? results.info[0].id : openId}
                onToggle={setOpenId}
              />
            </Section>
          )}
          {results.restaurants.length > 0 && (
            <Section title={t.guide.resultsRestaurants}>
              <Card style={styles.listCard}>
                <ListGroup>
                  {results.restaurants.map((r) => (
                    <ListRow
                      key={r.id}
                      title={displayName(r)}
                      subtitle={`${r.cuisine[lang]} · ${r.neighborhood}`}
                      onPress={() => router.push({ pathname: '/restaurants/[id]', params: { id: r.id } })}
                    />
                  ))}
                </ListGroup>
              </Card>
            </Section>
          )}
          {results.dishes.length > 0 && (
            <Section title={t.guide.resultsDishes}>
              <Card style={styles.listCard}>
                <ListGroup>
                  {results.dishes.map((d) => (
                    <ListRow key={d.id} title={d.name} onPress={() => router.push('/restaurants/dishes')} />
                  ))}
                </ListGroup>
              </Card>
            </Section>
          )}
          {results.night.length > 0 && (
            <Section title={t.guide.resultsNight}>
              <Card style={styles.listCard}>
                <ListGroup>
                  {results.night.map((p) => (
                    <ListRow
                      key={p.id}
                      title={p.name}
                      subtitle={`${p.vibe[lang]} · ${p.neighborhood}`}
                      onPress={() => router.push({ pathname: '/nightlife/[id]', params: { id: p.id } })}
                    />
                  ))}
                </ListGroup>
              </Card>
            </Section>
          )}
          {results.sport.length > 0 && (
            <Section title={t.guide.resultsSport}>
              <Card style={styles.listCard}>
                <ListGroup>
                  {results.sport.map((p) => (
                    <ListRow
                      key={p.id}
                      title={p.name}
                      subtitle={`${p.kind[lang]} · ${p.neighborhood}`}
                      onPress={() => router.push({ pathname: '/sports/[id]', params: { id: p.id } })}
                    />
                  ))}
                </ListGroup>
              </Card>
            </Section>
          )}
          {results.services.length > 0 && (
            <Section title={t.guide.resultsServices}>
              <Card style={styles.listCard}>
                <ListGroup>
                  {results.services.map((s) => (
                    <ListRow
                      key={s.id}
                      title={s.name}
                      subtitle={s.kind[lang]}
                      onPress={() => router.push({ pathname: '/services/[id]', params: { id: s.id } })}
                    />
                  ))}
                </ListGroup>
              </Card>
            </Section>
          )}
          {results.admin.length > 0 && (
            <Section title={t.guide.resultsAdmin}>
              <Card style={styles.listCard}>
                <ListGroup>
                  {results.admin.map((p) => (
                    <ListRow
                      key={p.id}
                      title={p.title}
                      subtitle={p.kind[lang]}
                      onPress={() => router.push({ pathname: '/admin/[id]', params: { id: p.id } })}
                    />
                  ))}
                </ListGroup>
              </Card>
            </Section>
          )}
          {results.beauty.length > 0 && (
            <Section title={t.guide.resultsBeauty}>
              <Card style={styles.listCard}>
                <ListGroup>
                  {results.beauty.map((p) => (
                    <ListRow
                      key={p.id}
                      title={p.name}
                      subtitle={`${p.kind[lang]} · ${p.neighborhoods.join(', ')}`}
                      onPress={() => router.push({ pathname: '/beauty/[id]', params: { id: p.id } })}
                    />
                  ))}
                </ListGroup>
              </Card>
            </Section>
          )}
          {results.places.length > 0 && (
            <Section title={t.guide.resultsPlaces}>
              <Card style={styles.listCard}>
                <ListGroup>
                  {results.places.map((a) => (
                    <ListRow
                      key={a.id}
                      title={a.name}
                      subtitle={a.neighborhood}
                      onPress={() => router.push({ pathname: '/attraction/[id]', params: { id: a.id } })}
                    />
                  ))}
                </ListGroup>
              </Card>
            </Section>
          )}
        </>
      )}

      {empty && (
        <Card style={styles.empty}>
          <AppText variant="title" style={{ textAlign: 'center' }}>
            {t.guide.noResults(query)}
          </AppText>
          <AppText color={theme.textSecondary} style={{ textAlign: 'center' }}>
            {t.guide.noResultsHint}
          </AppText>
          <Button
            label={t.guide.askWhatsapp}
            icon={<Icon name="whatsapp" size={17} color={theme.onBrand} />}
            onPress={() => Linking.openURL(`https://wa.me/${contacts.whatsapp}`)}
          />
        </Card>
      )}
    </Screen>
  );
}

/** Practical info as an accordion inside one card. */
function InfoList({
  items,
  lang,
  openId,
  onToggle,
}: {
  items: GuideItem[];
  lang: Lang;
  openId: string | null;
  onToggle: (id: string | null) => void;
}) {
  const theme = useTheme();
  return (
    <Card style={styles.listCard}>
      {items.map((item, i) => {
        const open = openId === item.id;
        return (
          <Animated.View key={item.id} layout={LinearTransition.duration(200)}>
            {i > 0 && <View style={[styles.divider, { backgroundColor: theme.line }]} />}
            <PressableScale
              accessibilityRole="button"
              accessibilityState={{ expanded: open }}
              onPress={() => onToggle(open ? null : item.id)}
              style={styles.infoRow}>
              <View style={styles.infoHead}>
                <View style={{ flex: 1, gap: 2 }}>
                  <AppText>{item.title[lang]}</AppText>
                  <AppText variant="caption" color={theme.textSecondary}>
                    {item.category[lang]}
                  </AppText>
                </View>
                <View style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}>
                  <Icon name="chevronDown" size={18} color={theme.textTertiary} />
                </View>
              </View>
              {open && (
                <Animated.View entering={FadeIn.duration(200)}>
                  <AppText variant="callout" color={theme.textSecondary} style={{ marginTop: Spacing.sm }}>
                    {item.body[lang]}
                  </AppText>
                </Animated.View>
              )}
            </PressableScale>
          </Animated.View>
        );
      })}
    </Card>
  );
}

const styles = StyleSheet.create({
  listCard: { paddingVertical: 0 },
  divider: { height: StyleSheet.hairlineWidth },
  infoRow: { paddingVertical: 14 },
  infoHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  empty: { gap: Spacing.md, alignItems: 'center', paddingVertical: Spacing.xl },
});
