import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking, ScrollView, StyleSheet } from 'react-native';

import { Icon, type IconName } from '@/components/icon';
import { ListGroup, ListRow } from '@/components/list';
import { Screen, Section } from '@/components/screen';
import { AppText, Card, Chip } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { demoApartment } from '@/lib/mock-data';
import {
  demoNearbyData,
  directionsUrl,
  formatDistance,
  formatRating,
  WALK_LIMIT_MIN,
  type NearbyCategoryId,
  type NearbyPlace,
} from '@/lib/nearby';

const CATEGORY_ICONS: Record<NearbyCategoryId, IconName> = {
  supermarket: 'supermarket',
  pharmacy: 'pharmacy',
  bakery: 'bakery',
  cafe: 'cafe',
  mall: 'mall',
  gym: 'gym',
  laundry: 'laundry',
  bank: 'bank',
  hospital: 'hospital',
};

/** Everyday places around the apartment (Google, precomputed), with walking directions. */
export default function NearbyScreen() {
  const theme = useTheme();
  const { t, lang } = useI18n();
  const { category } = useLocalSearchParams<{ category?: NearbyCategoryId }>();
  const [selected, setSelected] = useState<NearbyCategoryId | null>(category ?? null);

  const data = demoNearbyData;
  const categories = data.categories.filter((c) => c.places.length > 0);
  const visible = selected ? categories.filter((c) => c.id === selected) : categories;

  return (
    <Screen back title={t.nearby.title} subtitle={t.nearby.subtitle}>
      <Card style={styles.listCard}>
        <ListGroup inset>
          <ListRow
            icon="address"
            title={demoApartment.address}
            subtitle={`${t.nearby.from} · ${demoApartment.neighborhood}`}
          />
          {data.skema.walkMin != null && (
            <ListRow
              icon="school"
              title={t.nearby.skema}
              subtitle={[
                data.skema.distanceM != null ? formatDistance(data.skema.distanceM, lang) : null,
                t.nearby.walk(data.skema.walkMin),
              ]
                .filter(Boolean)
                .join(' · ')}
            />
          )}
        </ListGroup>
      </Card>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.bleed}
        contentContainerStyle={styles.chips}>
        <Chip label={t.nearby.all} selected={selected === null} onPress={() => setSelected(null)} />
        {categories.map((c) => (
          <Chip
            key={c.id}
            label={t.nearby.categories[c.id]}
            selected={selected === c.id}
            onPress={() => setSelected(selected === c.id ? null : c.id)}
          />
        ))}
      </ScrollView>

      {visible.map((c) => (
        <Section key={c.id} title={t.nearby.categories[c.id]}>
          <Card style={styles.listCard}>
            <ListGroup inset>
              {c.places.map((p) => (
                <PlaceRow key={p.placeId ?? p.name} place={p} icon={CATEGORY_ICONS[c.id]} />
              ))}
            </ListGroup>
          </Card>
        </Section>
      ))}

      <AppText variant="caption" color={theme.textSecondary} style={{ textAlign: 'center' }}>
        {t.nearby.hint} {t.nearby.source}
      </AppText>
    </Screen>
  );
}

function PlaceRow({ place, icon }: { place: NearbyPlace; icon: IconName }) {
  const theme = useTheme();
  const { t, lang } = useI18n();
  const far = place.walkMin != null && place.walkMin > WALK_LIMIT_MIN;
  const details = [
    place.walkMin == null
      ? null
      : far && place.driveMin != null
        ? t.nearby.drive(place.driveMin)
        : t.nearby.walk(place.walkMin),
    place.distanceM != null ? formatDistance(place.distanceM, lang) : null,
    place.rating != null ? `★ ${formatRating(place.rating, place.ratingCount, lang)}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <ListRow
      icon={icon}
      title={place.name}
      subtitle={`${details}\n${place.address}`}
      accessibilityLabel={`${place.name}, ${t.nearby.directions}`}
      onPress={() => Linking.openURL(directionsUrl(demoNearbyData.origin, place))}
      accessory={<Icon name="directions" size={16} color={theme.textTertiary} />}
    />
  );
}

const styles = StyleSheet.create({
  listCard: { paddingVertical: 0 },
  bleed: { marginHorizontal: -Spacing.gutter },
  chips: { gap: Spacing.sm, paddingHorizontal: Spacing.gutter },
});
