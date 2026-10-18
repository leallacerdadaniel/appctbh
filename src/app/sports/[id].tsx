import { Redirect, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { Linking, StyleSheet, View } from 'react-native';

import { HoursCard } from '@/components/hours-card';
import { Icon } from '@/components/icon';
import { ListGroup, ListRow } from '@/components/list';
import { PlacePhoto } from '@/components/place-photo';
import { Screen } from '@/components/screen';
import { AppText, Button, Card } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { formatDistance } from '@/lib/nearby';
import { getSportPlace, sportMapsUrl } from '@/lib/sports';

export default function SportPlaceScreen() {
  const theme = useTheme();
  const { t, lang } = useI18n();
  const { id } = useLocalSearchParams<{ id: string }>();
  const p = getSportPlace(id);

  if (!p) return <Redirect href="/sports" />;

  const fromHome =
    p.walkMin == null
      ? null
      : [
          p.distanceM != null ? formatDistance(p.distanceM, lang) : null,
          // Out-of-town places (wakeboard) would show "574 min walk".
          p.walkMin <= 60 ? t.restaurants.walk(p.walkMin) : null,
          p.driveMin != null ? t.restaurants.drive(p.driveMin) : null,
        ]
          .filter(Boolean)
          .join(' · ');

  return (
    <Screen back title={p.name} subtitle={`${p.kind[lang]} · ${p.neighborhood}`}>
      {p.logo && p.photo ? (
        // A brand logo looks poor blown up to a full-width photo: show it small.
        <Image
          source={p.photo}
          style={styles.logo}
          contentFit="cover"
          accessibilityLabel={p.name}
          accessibilityIgnoresInvertColors
        />
      ) : (
        <PlacePhoto
          placeId={p.placeId}
          source={p.photo}
          width={1000}
          aspectRatio={4 / 3}
          radius={Radius.lg}
          credit="below"
        />
      )}

      <AppText style={{ lineHeight: 23 }}>{p.description[lang]}</AppText>

      <Card style={{ paddingVertical: 0 }}>
        <ListGroup inset>
          {p.price && <ListRow icon="rent" title={t.sports.price} subtitle={p.price[lang]} />}
          {fromHome && <ListRow icon="walk" title={t.restaurants.fromHome} subtitle={fromHome} />}
          <ListRow icon="address" title={t.apartment.address} subtitle={p.address} />
          {p.website && (
            <ListRow icon="website" title={t.sports.website} onPress={() => Linking.openURL(p.website!)} />
          )}
        </ListGroup>
      </Card>

      <Card style={styles.tip}>
        <Icon name="tip" size={20} color={theme.warning} />
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="caption" color={theme.textSecondary}>
            {t.travel.tip}
          </AppText>
          <AppText>{p.tip[lang]}</AppText>
        </View>
      </Card>

      <HoursCard hours={p.hours} />

      <Button
        label={t.restaurants.directions}
        icon={<Icon name="directions" size={17} color={theme.onBrand} />}
        onPress={() => Linking.openURL(sportMapsUrl(p))}
      />

      <AppText variant="caption" color={theme.textSecondary} style={{ textAlign: 'center' }}>
        {t.sports.source}
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  tip: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  logo: { width: 88, height: 88, borderRadius: Radius.md },
});
