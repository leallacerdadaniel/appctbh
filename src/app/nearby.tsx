import { useLocalSearchParams } from 'expo-router';
import {
  Car,
  Coffee,
  Croissant,
  Dumbbell,
  Footprints,
  GraduationCap,
  Hospital,
  Landmark,
  MapPin,
  Navigation,
  Pill,
  ShoppingBag,
  ShoppingCart,
  Star,
  WashingMachine,
  type LucideIcon,
} from 'lucide-react-native';
import { useState } from 'react';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';

import { Reveal, Screen, SectionLabel } from '@/components/screen';
import { AppText, Card, PressableScale } from '@/components/ui';
import { Fonts, Radius, Spacing } from '@/constants/theme';
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

const CATEGORY_ICONS: Record<NearbyCategoryId, LucideIcon> = {
  supermarket: ShoppingCart,
  pharmacy: Pill,
  bakery: Croissant,
  cafe: Coffee,
  mall: ShoppingBag,
  gym: Dumbbell,
  laundry: WashingMachine,
  bank: Landmark,
  hospital: Hospital,
};

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
      <Reveal index={0}>
        <Card style={{ gap: Spacing.md }}>
          <View style={styles.line}>
            <MapPin size={20} color={theme.brand} />
            <View style={{ flex: 1 }}>
              <AppText variant="caption" color={theme.textSecondary}>
                {t.nearby.from}
              </AppText>
              <AppText style={{ fontFamily: Fonts.bodyMedium }}>{demoApartment.address}</AppText>
              <AppText variant="caption" color={theme.textSecondary}>
                {demoApartment.neighborhood}, {demoApartment.city}
              </AppText>
            </View>
          </View>
          {data.skema.walkMin != null && (
            <>
              <View style={[styles.divider, { backgroundColor: theme.line }]} />
              <View style={styles.line}>
                <GraduationCap size={20} color={theme.textSecondary} />
                <View style={{ flex: 1 }}>
                  <AppText style={{ fontFamily: Fonts.bodyMedium }}>{t.nearby.skema}</AppText>
                  <AppText variant="caption" color={theme.textSecondary}>
                    {data.skema.distanceM != null && `${formatDistance(data.skema.distanceM, lang)} · `}
                    {t.nearby.walk(data.skema.walkMin)}
                  </AppText>
                </View>
              </View>
            </>
          )}
        </Card>
      </Reveal>

      <Reveal index={1}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
          style={styles.chipsScroller}>
          <Chip label={t.nearby.all} active={selected === null} onPress={() => setSelected(null)} />
          {categories.map((c) => (
            <Chip
              key={c.id}
              Icon={CATEGORY_ICONS[c.id]}
              label={t.nearby.categories[c.id]}
              active={selected === c.id}
              onPress={() => setSelected(selected === c.id ? null : c.id)}
            />
          ))}
        </ScrollView>
      </Reveal>

      <Reveal index={2}>
        <AppText variant="caption" color={theme.textSecondary}>
          {t.nearby.hint}
        </AppText>
      </Reveal>


      {visible.map((c, i) => {
        const Icon = CATEGORY_ICONS[c.id];
        return (
          <Animated.View key={c.id} layout={LinearTransition.duration(220)} style={{ gap: Spacing.sm }}>
            <View style={styles.sectionHead}>
              <Icon size={16} color={theme.textSecondary} />
              <SectionLabel>{t.nearby.categories[c.id]}</SectionLabel>
            </View>
            <Card style={{ paddingVertical: Spacing.xs }}>
              {c.places.map((p, j) => (
                <View key={p.placeId ?? p.name}>
                  {j > 0 && <View style={[styles.divider, { backgroundColor: theme.line }]} />}
                  <PlaceRow place={p} />
                </View>
              ))}
            </Card>
          </Animated.View>
        );
      })}

      <AppText variant="caption" color={theme.textSecondary} style={{ textAlign: 'center' }}>
        {t.nearby.source}
      </AppText>
    </Screen>
  );
}

function PlaceRow({ place }: { place: NearbyPlace }) {
  const theme = useTheme();
  const { t, lang } = useI18n();
  const far = place.walkMin != null && place.walkMin > WALK_LIMIT_MIN;

  return (
    <PressableScale
      accessibilityRole="link"
      accessibilityLabel={`${place.name}, ${t.nearby.directions}`}
      onPress={() => Linking.openURL(directionsUrl(demoNearbyData.origin, place))}
      style={styles.place}>
      <View style={{ flex: 1, gap: 2 }}>
        <AppText style={{ fontFamily: Fonts.bodyMedium }}>{place.name}</AppText>
        <AppText variant="caption" color={theme.textSecondary}>
          {place.address}
        </AppText>
        <View style={styles.meta}>
          {place.walkMin != null && (
            <Meta Icon={Footprints} text={t.nearby.walk(place.walkMin)} strong={!far} />
          )}
          {far && place.driveMin != null && <Meta Icon={Car} text={t.nearby.drive(place.driveMin)} strong />}
          {place.distanceM != null && <Meta text={formatDistance(place.distanceM, lang)} />}
          {place.rating != null && (
            <Meta Icon={Star} text={formatRating(place.rating, place.ratingCount, lang)} />
          )}
        </View>
      </View>
      <View style={[styles.go, { backgroundColor: theme.brandSoft }]}>
        <Navigation size={16} color={theme.brand} />
      </View>
    </PressableScale>
  );
}

function Meta({ Icon, text, strong }: { Icon?: LucideIcon; text: string; strong?: boolean }) {
  const theme = useTheme();
  const color = strong ? theme.text : theme.textSecondary;
  return (
    <View style={styles.metaItem}>
      {Icon && <Icon size={13} color={color} />}
      <AppText variant="caption" color={color}>
        {text}
      </AppText>
    </View>
  );
}

function Chip({
  Icon,
  label,
  active,
  onPress,
}: {
  Icon?: LucideIcon;
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[
        styles.chip,
        active
          ? { backgroundColor: theme.brand, borderColor: theme.brand }
          : { backgroundColor: theme.surface, borderColor: theme.line },
      ]}>
      {Icon && <Icon size={15} color={active ? theme.onBrand : theme.text} />}
      <AppText
        variant="caption"
        color={active ? theme.onBrand : theme.text}
        style={{ fontFamily: Fonts.bodyMedium }}>
        {label}
      </AppText>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  line: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  divider: { height: StyleSheet.hairlineWidth },
  // Bleed the chip row to the screen edges so it scrolls under the gutter.
  chipsScroller: { marginHorizontal: -Spacing.md },
  chips: { gap: Spacing.sm, paddingHorizontal: Spacing.md },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 36,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  sectionHead: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm },
  place: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
  },
  meta: { flexDirection: 'row', flexWrap: 'wrap', columnGap: Spacing.md, rowGap: 2, marginTop: 2 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  go: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
