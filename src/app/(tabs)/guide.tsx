import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import { Linking, StyleSheet, TextInput } from 'react-native';

import { HubGrid, HubTile } from '@/components/hub-tile';
import { Icon } from '@/components/icon';
import { ListGroup, ListRow } from '@/components/list';
import { Screen, Section } from '@/components/screen';
import { SearchField } from '@/components/search-field';
import { AppText, Button, Card } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { adminProcedures } from '@/lib/admin';
import { beautyPlaces } from '@/lib/beauty';
import { dishes } from '@/lib/dishes';
import {
  BEAUTY_GROUP_KEYWORDS,
  GUIDE_SECTIONS,
  makeMatcher,
  nearbyWords,
  sectionWords,
  SPORT_GROUP_KEYWORDS,
} from '@/lib/guide-search';
import { contacts } from '@/lib/mock-data';
import { nightPlaces } from '@/lib/nightlife';
import { usePlaces } from '@/lib/places';
import { services } from '@/lib/services';
import { strings } from '@/i18n/strings';
import { sportPlaces } from '@/lib/sports';
import { displayName, restaurants } from '@/lib/restaurants';
import { trackAction, trackSearch } from '@/lib/usage';

/**
 * "Guide": everything for living in BH — eating (restaurants, dishes), going out at night, sport, everyday needs
 * (nearby places, emergencies) and the practical info. Exploring and travel live in Explorer.
 */
const SEARCH_SETTLE_MS = 1500;

export default function GuideScreen() {
  const theme = useTheme();
  const { t, lang } = useI18n();
  const params = useLocalSearchParams<{ focus?: string; q?: string }>();
  const inputRef = useRef<ComponentRef<typeof TextInput>>(null);
  const [query, setQuery] = useState('');
  const nearby = usePlaces()?.nearby;

  // Arriving from the Home search bar or a shortcut (e.g. "Urgences").
  useFocusEffect(
    useCallback(() => {
      if (params.q) setQuery(params.q);
      if (params.focus) setTimeout(() => inputRef.current?.focus(), 250);
    }, [params.q, params.focus]),
  );

  const q = query.trim();

  // Only what the Guide shows, in FR, EN and PT, so "ménage" or "farmácia" work in any language.
  const results = useMemo(() => {
    const has = makeMatcher(q);
    if (!has) return null;
    const both = <K extends string>(pick: (s: typeof strings.fr) => Record<K, string>, key: K) => [
      pick(strings.fr)[key],
      pick(strings.en)[key],
    ];
    const nearbyHits = (nearby?.categories ?? []).flatMap((c) =>
      c.places.filter((p) => has([p.name])).map((p) => ({ ...p, category: c.id })),
    );
    return {
      sections: GUIDE_SECTIONS.filter((sec) => has(sectionWords(sec))),
      nearbyCategories: (Object.keys(t.nearby.categories) as (keyof typeof t.nearby.categories)[]).filter((id) =>
        has(nearbyWords(id)),
      ),
      nearbyPlaces: nearbyHits,
      restaurants: restaurants.filter((r) => has([r.name, ...Object.values(r.cuisine), r.neighborhood])),
      dishes: dishes.filter((d) => has([d.name])),
      night: nightPlaces.filter((p) => has([p.name, ...Object.values(p.vibe), p.neighborhood])),
      sport: sportPlaces.filter((p) =>
        has([
          p.name,
          ...Object.values(p.kind),
          p.neighborhood,
          ...p.groups.flatMap((g) => [...both((s) => s.sports.groups, g), ...(SPORT_GROUP_KEYWORDS[g] ?? [])]),
        ]),
      ),
      services: services.filter((s) =>
        has([s.name, ...Object.values(s.kind), ...both((x) => x.services.groups, s.group)]),
      ),
      admin: adminProcedures.filter((p) => has([p.title, ...Object.values(p.kind), ...p.keywords])),
      beauty: beautyPlaces.filter((p) =>
        has([
          p.name,
          ...Object.values(p.kind),
          ...p.neighborhoods,
          ...both((s) => s.beauty.groups, p.group),
          ...BEAUTY_GROUP_KEYWORDS[p.group],
        ]),
      ),
    };
  }, [q, nearby, t]);

  // Counts once the student stops typing, so "res", "rest", "resta" don't become three searches.
  useEffect(() => {
    if (!results) return;
    const found = Object.values(results).reduce((total, list) => total + list.length, 0);
    const timer = setTimeout(() => trackSearch(q.toLowerCase(), found), SEARCH_SETTLE_MS);
    return () => clearTimeout(timer);
  }, [q, results]);

  const empty = results && Object.values(results).every((list) => list.length === 0);

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
              <HubTile emoji="🛂" title={t.admin.title} status={t.admin.status} onPress={() => router.push('/admin')} />
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
          {results.sections.length > 0 && (
            <Section title={t.guide.resultsSections}>
              <Card style={styles.listCard}>
                <ListGroup>
                  {results.sections.map((sec) => (
                    <ListRow key={sec.id} title={sec.title(t)} onPress={() => router.push(sec.path)} />
                  ))}
                </ListGroup>
              </Card>
            </Section>
          )}
          {(results.nearbyCategories.length > 0 || results.nearbyPlaces.length > 0) && (
            <Section title={t.nearby.title}>
              <Card style={styles.listCard}>
                <ListGroup>
                  {results.nearbyCategories.map((id) => (
                    <ListRow
                      key={id}
                      title={t.nearby.categories[id]}
                      onPress={() =>
                        router.push({
                          pathname: '/nearby',
                          params: { category: id },
                        })
                      }
                    />
                  ))}
                  {results.nearbyPlaces.map((p) => (
                    <ListRow
                      key={`${p.category}-${p.placeId ?? p.name}`}
                      title={p.name}
                      subtitle={t.nearby.categories[p.category]}
                      onPress={() =>
                        router.push({
                          pathname: '/nearby',
                          params: { category: p.category },
                        })
                      }
                    />
                  ))}
                </ListGroup>
              </Card>
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
                      onPress={() =>
                        router.push({
                          pathname: '/restaurants/[id]',
                          params: { id: r.id },
                        })
                      }
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
                    <ListRow
                      key={d.id}
                      title={d.name}
                      onPress={() =>
                        router.push({
                          pathname: '/restaurants/dishes',
                          params: { dish: d.id },
                        })
                      }
                    />
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
                      onPress={() =>
                        router.push({
                          pathname: '/nightlife/[id]',
                          params: { id: p.id },
                        })
                      }
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
                      onPress={() =>
                        router.push({
                          pathname: '/sports/[id]',
                          params: { id: p.id },
                        })
                      }
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
                      onPress={() =>
                        router.push({
                          pathname: '/services/[id]',
                          params: { id: s.id },
                        })
                      }
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
                      onPress={() =>
                        router.push({
                          pathname: '/admin/[id]',
                          params: { id: p.id },
                        })
                      }
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
                      onPress={() =>
                        router.push({
                          pathname: '/beauty/[id]',
                          params: { id: p.id },
                        })
                      }
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
            onPress={() => {
              trackAction('open_whatsapp', 'guide');
              Linking.openURL(`https://wa.me/${contacts.whatsapp}`);
            }}
          />
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  listCard: { paddingVertical: 0 },
  empty: { gap: Spacing.md, alignItems: 'center', paddingVertical: Spacing.xl },
});
