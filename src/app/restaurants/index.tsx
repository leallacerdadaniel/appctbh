import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { RatingPill } from '@/components/photo-card';
import { PlacePhoto } from '@/components/place-photo';
import { PriceLevel } from '@/components/price-level';
import { Screen, Section } from '@/components/screen';
import { AppText, Chip, PressableScale } from '@/components/ui';
import { Fonts, Radius, Shadow, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { WALK_LIMIT_MIN } from '@/lib/nearby';
import { usePlacePhoto } from '@/lib/place-photo';
import { displayName, restaurants, type Restaurant, type Tier } from '@/lib/restaurants';

const TIERS: Tier[] = ['occasion', 'everyday', 'burger'];

export default function RestaurantsScreen() {
  const theme = useTheme();
  const { t } = useI18n();
  const [tier, setTier] = useState<Tier | null>(null);

  const shown = tier ? TIERS.filter((x) => x === tier) : TIERS;

  return (
    <Screen back title={t.restaurants.title} subtitle={t.restaurants.subtitle}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.bleed}
        contentContainerStyle={styles.chips}>
        <Chip label={t.restaurants.all} selected={tier === null} onPress={() => setTier(null)} />
        {TIERS.map((x) => (
          <Chip
            key={x}
            label={t.restaurants.tiers[x]}
            selected={tier === x}
            onPress={() => setTier(tier === x ? null : x)}
          />
        ))}
      </ScrollView>

      <AppText variant="callout" color={theme.textSecondary}>
        {t.restaurants.count(restaurants.filter((r) => shown.includes(r.tier)).length)}
      </AppText>

      {shown.map((x) => {
        const list = restaurants.filter((r) => r.tier === x);
        return (
          <Section key={x} title={t.restaurants.tiers[x]} subtitle={t.restaurants.tierHints[x]}>
            <View style={{ gap: 12 }}>
              {list.map((r) => (
                <RestaurantRow key={r.id} restaurant={r} />
              ))}
            </View>
          </Section>
        );
      })}

      <AppText variant="caption" color={theme.textSecondary} style={{ textAlign: 'center' }}>
        {t.restaurants.source}
      </AppText>
    </Screen>
  );
}

/** DUO-style row: square photo with the rating on it, then name, cuisine • price, area • distance. */
function RestaurantRow({ restaurant: r }: { restaurant: Restaurant }) {
  const theme = useTheme();
  const { t, lang } = useI18n();
  const photo = usePlacePhoto(r.placeId, 300);
  const far = r.walkMin != null && r.walkMin > WALK_LIMIT_MIN;
  const distance =
    r.walkMin == null
      ? null
      : far && r.driveMin != null
        ? t.restaurants.drive(r.driveMin)
        : t.restaurants.walk(r.walkMin);

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${displayName(r)}, ${r.cuisine[lang]}, ${r.neighborhood}`}
      onPress={() => router.push({ pathname: '/restaurants/[id]', params: { id: r.id } })}
      style={[styles.row, Shadow.card, { backgroundColor: theme.surface }]}>
      <View style={styles.thumb}>
        <PlacePhoto placeId={r.placeId} width={300} aspectRatio={1} radius={Radius.md} />
        {r.rating != null && (
          <View style={styles.ratingSlot}>
            <RatingPill rating={r.rating} />
          </View>
        )}
      </View>
      <View style={styles.text}>
        <AppText style={{ fontFamily: Fonts.bodyMedium }}>{displayName(r)}</AppText>
        <View style={styles.line}>
          <AppText variant="callout" color={theme.textSecondary}>
            {r.cuisine[lang]}
          </AppText>
          {r.priceLevel != null && (
            <>
              <AppText variant="callout" color={theme.textTertiary}>
                •
              </AppText>
              <PriceLevel level={r.priceLevel} />
            </>
          )}
        </View>
        <AppText variant="callout" color={theme.textSecondary}>
          {r.neighborhood}
          {distance ? ` • ${distance}` : ''}
        </AppText>
        {r.top100 != null && (
          <View style={styles.line}>
            <Icon name="award" size={13} color={theme.textSecondary} />
            <AppText variant="caption" color={theme.textSecondary}>
              {t.restaurants.top100Short}
            </AppText>
          </View>
        )}
        {photo?.author && (
          <AppText color={theme.textTertiary} style={styles.credit}>
            © {photo.author}
          </AppText>
        )}
      </View>
      <Icon name="chevronRight" size={15} color={theme.textTertiary} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  bleed: { marginHorizontal: -Spacing.gutter },
  chips: { gap: Spacing.sm, paddingHorizontal: Spacing.gutter },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 10, borderRadius: Radius.lg },
  thumb: { width: 92 },
  ratingSlot: { position: 'absolute', top: 5, left: 5 },
  text: { flex: 1, gap: 3 },
  line: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 5 },
  credit: { fontSize: 10, lineHeight: 13 },
});
