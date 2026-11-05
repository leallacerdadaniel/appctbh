import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { PlacePhoto } from '@/components/place-photo';
import { AppText, PressableScale } from '@/components/ui';
import { Fonts, Radius, Shadow, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { WALK_LIMIT_MIN } from '@/lib/nearby';
import { useTimes } from '@/lib/places';
import { displayName, type Restaurant } from '@/lib/restaurants';

const CARD_WIDTH = 220;

/** Dark pill with a yellow star, placed over photos (top-right). */
export function RatingPill({ rating }: { rating: number }) {
  const theme = useTheme();
  const { lang } = useI18n();
  return (
    <View style={[styles.rating, { backgroundColor: theme.scrim }]}>
      <Icon name="star" size={13} color={theme.star} />
      <AppText variant="caption" color={theme.onBrand} style={{ fontFamily: Fonts.bodyMedium }}>
        {rating.toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-US', { minimumFractionDigits: 1 })}
      </AppText>
    </View>
  );
}

/** "Lourdes • 9 min à pied", or the car time when walking is not realistic. */
export function useDistanceLabel(place: Pick<Restaurant, 'placeId'>) {
  const { t } = useI18n();
  const r = useTimes(place) as Pick<Restaurant, 'walkMin' | 'driveMin'>;
  if (r.walkMin == null) return null;
  return r.walkMin > WALK_LIMIT_MIN && r.driveMin != null
    ? t.restaurants.drive(r.driveMin)
    : t.restaurants.walk(r.walkMin);
}

/** Carousel item: photo on top with the rating over it, then name, cuisine and where. */
export function RestaurantPhotoCard({ restaurant: r }: { restaurant: Restaurant }) {
  const theme = useTheme();
  const { lang } = useI18n();
  const distance = useDistanceLabel(r);

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${displayName(r)}, ${r.cuisine[lang]}, ${r.neighborhood}`}
      onPress={() => router.push({ pathname: '/restaurants/[id]', params: { id: r.id } })}
      style={[styles.card, Shadow.card, { backgroundColor: theme.surface }]}>
      <View>
        <PlacePhoto placeId={r.placeId} width={480} radius={0} credit="overlay" />
        {r.rating != null && (
          <View style={styles.ratingSlot}>
            <RatingPill rating={r.rating} />
          </View>
        )}
      </View>
      <View style={styles.body}>
        <AppText style={{ fontFamily: Fonts.bodyMedium }}>{displayName(r)}</AppText>
        <AppText variant="callout" color={theme.textSecondary}>
          {r.cuisine[lang]}
        </AppText>
        <AppText variant="callout" color={theme.textSecondary}>
          {r.neighborhood}
          {distance ? ` • ${distance}` : ''}
        </AppText>
      </View>
    </PressableScale>
  );
}

/** Horizontal carousel that bleeds to the screen edges; the gutter becomes inner padding. */
export function Carousel({ children }: { children: ReactNode }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.bleed}
      contentContainerStyle={styles.track}>
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: { width: CARD_WIDTH, borderRadius: Radius.lg, overflow: 'hidden' },
  body: { padding: Spacing.md - 4, paddingHorizontal: 14, gap: 2 },
  ratingSlot: { position: 'absolute', top: 8, right: 8 },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.pill,
  },
  bleed: { marginHorizontal: -Spacing.gutter },
  // Vertical padding leaves room for the card shadow.
  track: { gap: 12, paddingHorizontal: Spacing.gutter, paddingVertical: 6 },
});
