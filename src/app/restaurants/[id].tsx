import * as Clipboard from 'expo-clipboard';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { Linking, StyleSheet, View } from 'react-native';

import { HoursCard } from '@/components/hours-card';
import { Icon, type IconName } from '@/components/icon';
import { ListGroup, ListRow } from '@/components/list';
import { PlacePhoto } from '@/components/place-photo';
import { PriceLevel } from '@/components/price-level';
import { Screen, Section } from '@/components/screen';
import { useToast } from '@/components/toast';
import { AppText, Button, Card, PressableScale } from '@/components/ui';
import { Radius, Spacing, TapTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { formatRating } from '@/lib/nearby';
import { useFromHome, useTimes } from '@/lib/places';
import { displayName, getRestaurant, mapsUrl } from '@/lib/restaurants';

export default function RestaurantScreen() {
  const theme = useTheme();
  const toast = useToast();
  const { t, lang } = useI18n();
  const { id } = useLocalSearchParams<{ id: string }>();
  const r = useTimes(getRestaurant(id));
  const fromHome = useFromHome(r);

  if (!r) return <Redirect href="/restaurants" />;


  return (
    <Screen back title={displayName(r)} subtitle={`${r.cuisine[lang]} · ${r.neighborhood}`}>
      <PlacePhoto placeId={r.placeId} width={1000} aspectRatio={4 / 3} radius={Radius.lg} credit="below" />

      <AppText style={{ lineHeight: 23 }}>{r.description[lang]}</AppText>

      <Card style={styles.listCard}>
        <ListGroup inset>
          {r.top100 != null && <ListRow icon="award" title={t.restaurants.top100(r.top100)} />}
          {r.rating != null && (
            <ListRow
              icon="star"
              title={formatRating(r.rating, null, lang)}
              subtitle={r.ratingCount ? t.restaurants.reviews(compact(r.ratingCount, lang)) : undefined}
            />
          )}
          {r.priceLevel != null && (
            <ListRow
              icon="rent"
              title={t.restaurants.priceLevels[r.priceLevel]}
              subtitle={t.restaurants.tiers[r.tier]}
              accessory={<PriceLevel level={r.priceLevel} />}
            />
          )}
          {fromHome && <ListRow icon="walk" title={t.restaurants.fromHome} subtitle={fromHome} />}
        </ListGroup>
      </Card>

      <Section title={t.restaurants.goodFor}>
        <Tags items={r.goodFor.map((g) => t.restaurants.goodForLabels[g])} />
      </Section>

      {r.tip && (
        <Card style={styles.tip}>
          <Icon name="tip" size={20} color={theme.warning} />
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="caption" color={theme.textSecondary}>
              {t.restaurants.tip}
            </AppText>
            <AppText>{r.tip[lang]}</AppText>
          </View>
        </Card>
      )}

      <Button
        label={t.restaurants.directions}
        icon={<Icon name="directions" size={17} color={theme.onBrand} />}
        onPress={() => Linking.openURL(mapsUrl(r))}
      />

      <HoursCard hours={r.hours} />

      <Section title={t.restaurants.info}>
        <Card style={styles.listCard}>
          <ListGroup inset>
            <ListRow
              icon="address"
              title={t.apartment.address}
              subtitle={r.address}
              accessory={
                <IconButton
                  icon="copy"
                  label={t.restaurants.copyAddress}
                  onPress={async () => {
                    await Clipboard.setStringAsync(r.address);
                    toast(t.restaurants.addressCopied);
                  }}
                />
              }
            />
            {r.phone && (
              <ListRow
                icon="phone"
                title={t.restaurants.call}
                subtitle={r.phone}
                onPress={() => Linking.openURL(`tel:${r.phone!.replace(/\s/g, '')}`)}
              />
            )}
            {r.website && (
              <ListRow
                icon="website"
                title={t.restaurants.website}
                onPress={() => Linking.openURL(r.website!)}
              />
            )}
          </ListGroup>
        </Card>
      </Section>

      <AppText variant="caption" color={theme.textSecondary} style={{ textAlign: 'center' }}>
        {t.restaurants.source}
      </AppText>
    </Screen>
  );
}

/** Neutral tags (dishes, occasions): `fill` pills, no color. */
function Tags({ items }: { items: string[] }) {
  const theme = useTheme();
  return (
    <View style={styles.tags}>
      {items.map((label) => (
        <View key={label} style={[styles.tag, { backgroundColor: theme.surface, borderColor: theme.line }]}>
          <AppText variant="callout">{label}</AppText>
        </View>
      ))}
    </View>
  );
}

function compact(n: number, lang: 'fr' | 'en') {
  return n.toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  });
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
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  tip: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  iconButton: {
    width: TapTarget,
    height: TapTarget,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -10,
  },
});
