import { useState } from 'react';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';

import { Icon, type IconName } from '@/components/icon';
import { ListGroup, ListRow } from '@/components/list';
import { Section } from '@/components/screen';
import { AppText, Card, Chip } from '@/components/ui';
import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { formatCount, mapsPlaceUrl, type NearbyPlace, type TopRatedCategoryId } from '@/lib/nearby';
import { usePlaces } from '@/lib/places';

const ICONS: Record<TopRatedCategoryId, IconName> = { restaurant: 'restaurant', bar: 'bar', cafe: 'cafe' };

/**
 * The best-rated places on Google within a walk of the student's apartment (owner, 2026-11-09: "puxa os mais
 * bem avaliados do Google nas proximidades do apto [...] podendo ir pro Maps direto"). Precomputed per
 * apartment by `scripts/nearby.py`; a tap opens the place in Google Maps. Hidden until the apartment has them.
 */
export function TopRatedNearHome({ only }: { only?: TopRatedCategoryId[] }) {
  const theme = useTheme();
  const { t } = useI18n();
  const lists = (usePlaces()?.nearby.topRated ?? []).filter(
    (c) => c.places.length > 0 && (!only || only.includes(c.id)),
  );
  const [selected, setSelected] = useState<TopRatedCategoryId | null>(null);
  if (lists.length === 0) return null;
  const current = lists.find((c) => c.id === selected) ?? lists[0];

  return (
    <Section title={t.topRated.title} subtitle={t.topRated.subtitle}>
      {lists.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.bleed}
          contentContainerStyle={styles.chips}>
          {lists.map((c) => (
            <Chip
              key={c.id}
              label={t.topRated.categories[c.id]}
              selected={c.id === current.id}
              onPress={() => setSelected(c.id)}
            />
          ))}
        </ScrollView>
      )}
      <Card style={styles.listCard}>
        <ListGroup inset>
          {current.places.map((p) => (
            <TopRatedRow key={p.placeId ?? p.name} place={p} icon={ICONS[current.id]} />
          ))}
        </ListGroup>
      </Card>
      <AppText variant="caption" color={theme.textSecondary}>
        {t.topRated.source}
      </AppText>
    </Section>
  );
}

function TopRatedRow({ place, icon }: { place: NearbyPlace; icon: IconName }) {
  const theme = useTheme();
  const { t, lang } = useI18n();
  const rating = [
    place.rating != null ? `★ ${place.rating.toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-US', { minimumFractionDigits: 1 })}` : null,
    place.ratingCount != null ? t.topRated.reviews(formatCount(place.ratingCount, lang)) : null,
    place.priceLevel ? '$'.repeat(place.priceLevel) : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <ListRow
      icon={icon}
      title={place.name}
      subtitle={rating}
      accessibilityLabel={`${place.name}, ${rating}. ${t.topRated.open}`}
      onPress={() => Linking.openURL(mapsPlaceUrl(place))}
      accessory={
        <View style={styles.accessory}>
          {place.walkMin != null && (
            <AppText variant="caption" style={{ fontFamily: Fonts.bodyMedium }}>
              {t.nearby.walk(place.walkMin)}
            </AppText>
          )}
          <Icon name="external" size={16} color={theme.textTertiary} />
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  listCard: { paddingVertical: 0 },
  accessory: { alignItems: 'flex-end', gap: 4 },
  bleed: { marginHorizontal: -Spacing.gutter },
  chips: { gap: Spacing.sm, paddingHorizontal: Spacing.gutter },
});
