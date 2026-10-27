import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';

import { Icon, type IconName } from '@/components/icon';
import { ListGroup, ListRow } from '@/components/list';
import { Screen, Section } from '@/components/screen';
import { useToast } from '@/components/toast';
import { AppText, Card, Chip, PressableScale } from '@/components/ui';
import { Spacing, TapTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { useHome } from '@/lib/home';
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
  mall: 'mall',
  gym: 'gym',
  laundry: 'laundry',
  hospital: 'hospital',
};

// Official campus address (skema.edu, checked 2026-10-19).
const SKEMA_ADDRESS = 'Av. do Contorno, 5456 – Savassi, Belo Horizonte – MG, 30110-036';

const mapsUrl = (query: string) => `https://maps.google.com/?q=${encodeURIComponent(query)}`;

/** Everyday places around the apartment (Google, precomputed), with walking directions. */
export default function NearbyScreen() {
  const theme = useTheme();
  const toast = useToast();
  const { t, lang } = useI18n();
  const { category } = useLocalSearchParams<{ category?: NearbyCategoryId }>();
  const [selected, setSelected] = useState<NearbyCategoryId | null>(category ?? null);

  const data = demoNearbyData;
  const categories = data.categories.filter((c) => c.places.length > 0);
  const visible = selected ? categories.filter((c) => c.id === selected) : categories;

  // Same address the "Mon appart" tab copies.
  const { apartment } = useHome();
  const apartmentAddress = [apartment.address, apartment.complement].filter(Boolean).join(', ');

  async function copy(value: string) {
    await Clipboard.setStringAsync(value);
    toast(t.apartment.addressCopied);
  }

  // Two actions side by side (a button can't sit inside a pressable row).
  const addressActions = (mapsQuery: string, address: string) => (
    <View style={styles.inline}>
      <IconButton icon="directions" label={t.apartment.openMaps} onPress={() => Linking.openURL(mapsUrl(mapsQuery))} />
      <IconButton icon="copy" label={t.apartment.copyAddress} onPress={() => copy(address)} />
    </View>
  );

  return (
    <Screen back title={t.nearby.title} subtitle={t.nearby.subtitle}>
      <Card style={styles.listCard}>
        <ListGroup inset>
          <ListRow
            icon="address"
            title={apartment.address}
            subtitle={t.nearby.from}
            accessory={addressActions(apartment.mapsQuery, apartmentAddress)}
          />
          <ListRow
            icon="school"
            title={t.nearby.skema}
            subtitle={[
              SKEMA_ADDRESS,
              [
                data.skema.distanceM != null ? formatDistance(data.skema.distanceM, lang) : null,
                // Same rule as the places below: past the walking limit, show the car time.
                data.skema.walkMin == null
                  ? null
                  : data.skema.walkMin > WALK_LIMIT_MIN && data.skema.driveMin != null
                    ? t.nearby.drive(data.skema.driveMin)
                    : t.nearby.walk(data.skema.walkMin),
              ]
                .filter(Boolean)
                .join(' · '),
            ]
              .filter(Boolean)
              .join('\n')}
            accessory={addressActions(SKEMA_ADDRESS, SKEMA_ADDRESS)}
          />
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
          {c.id === 'hospital' && (
            <Card style={styles.notice}>
              <Icon name="tip" size={20} color={theme.warning} />
              <AppText variant="callout" color={theme.textSecondary} style={{ flex: 1 }}>
                {t.nearby.hospitalNotice}
              </AppText>
            </Card>
          )}
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

function IconButton({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={styles.iconButton}>
      <Icon name={icon} size={18} color={theme.textSecondary} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  listCard: { paddingVertical: 0 },
  inline: { flexDirection: 'row' },
  notice: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  iconButton: {
    width: TapTarget,
    height: TapTarget,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -10,
  },
  bleed: { marginHorizontal: -Spacing.gutter },
  chips: { gap: Spacing.sm, paddingHorizontal: Spacing.gutter },
});
